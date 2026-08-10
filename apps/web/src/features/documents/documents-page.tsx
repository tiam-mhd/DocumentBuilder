'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  PublicDocument,
  PublicDocumentTemplate,
} from '@vdb/shared-types';
import {
  approveDocument,
  createDocument,
  deleteDocument,
  listDocuments,
  publishDocument,
  rejectDocument,
  reopenDocument,
  submitDocumentReview,
  unpublishDocument,
} from '@/shared/api/documents';
import { listTemplates } from '@/shared/api/templates';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import { useMembershipPermissions } from '@/shared/lib/use-membership-permissions';
import { useEntitlements } from '@/features/billing/use-entitlements';
import styles from './documents-page.module.css';

export function DocumentsPage() {
  const t = useTranslations('documents');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const { activeBusiness } = useBusinesses();
  const { writable, loading: entLoading } = useEntitlements();
  const { canPublish, canManageDocuments } = useMembershipPermissions();
  const [items, setItems] = useState<PublicDocument[]>([]);
  const [templates, setTemplates] = useState<PublicDocumentTemplate[]>([]);
  const [title, setTitle] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const isApprover = canPublish;
  const canMutate = writable && canManageDocuments && !entLoading;

  async function refresh() {
    if (!activeBusiness) {
      setItems([]);
      setTemplates([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [list, tpl] = await Promise.all([
        listDocuments(activeBusiness.id, { page: 1, pageSize: 50 }),
        listTemplates(activeBusiness.id, { page: 1, pageSize: 100 }),
      ]);
      setItems(list.items);
      setTemplates(tpl.items);
      if (!templateId && tpl.items[0]) setTemplateId(tpl.items[0].id);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(mapApiErrorCode(err.code, tErrors));
      } else {
        setError(tErrors('UNKNOWN'));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusiness?.id]);

  async function onCreate() {
    if (!activeBusiness) return;
    if (!title.trim()) {
      setError(t('titleRequired'));
      return;
    }
    if (!templateId) {
      setError(t('templateRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createDocument(activeBusiness.id, {
        title: title.trim(),
        templateId,
      });
      setTitle('');
      await refresh();
      router.push(`/${locale}/app/documents/${created.id}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(mapApiErrorCode(err.code, tErrors));
      } else {
        setError(tErrors('UNKNOWN'));
      }
    } finally {
      setBusy(false);
    }
  }

  async function onWorkflow(
    doc: PublicDocument,
    action: 'submit' | 'approve' | 'reject' | 'publish' | 'unpublish' | 'reopen',
  ) {
    if (!activeBusiness) return;
    setBusy(true);
    setError(null);
    try {
      switch (action) {
        case 'submit':
          await submitDocumentReview(activeBusiness.id, doc.id);
          break;
        case 'approve':
          await approveDocument(activeBusiness.id, doc.id);
          break;
        case 'reject':
          await rejectDocument(activeBusiness.id, doc.id);
          break;
        case 'publish':
          await publishDocument(activeBusiness.id, doc.id);
          break;
        case 'unpublish':
          await unpublishDocument(activeBusiness.id, doc.id);
          break;
        case 'reopen':
          await reopenDocument(activeBusiness.id, doc.id);
          break;
      }
      await refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(mapApiErrorCode(err.code, tErrors));
      } else {
        setError(tErrors('UNKNOWN'));
      }
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!activeBusiness) return;
    if (!window.confirm(t('deleteConfirm'))) return;
    setBusy(true);
    setError(null);
    try {
      await deleteDocument(activeBusiness.id, id);
      await refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(mapApiErrorCode(err.code, tErrors));
      } else {
        setError(tErrors('UNKNOWN'));
      }
    } finally {
      setBusy(false);
    }
  }

  if (!activeBusiness) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.hint}>{t('needBusiness')}</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.hint}>{t('hint')}</p>

      <div className={styles.create}>
        <label className={styles.field}>
          <span>{t('docTitle')}</span>
          <input
            className={styles.input}
            value={title}
            disabled={!canMutate || busy}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('titlePlaceholder')}
          />
        </label>
        <label className={styles.field}>
          <span>{t('template')}</span>
          <select
            className={styles.input}
            value={templateId}
            disabled={!canMutate || busy || templates.length === 0}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            {templates.length === 0 ? (
              <option value="">{t('noTemplates')}</option>
            ) : (
              templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))
            )}
          </select>
        </label>
        <button
          type="button"
          className={styles.primary}
          disabled={!canMutate || busy || templates.length === 0}
          onClick={() => void onCreate()}
        >
          {busy ? t('creating') : t('create')}
        </button>
        {templates.length === 0 ? (
          <Link
            className={styles.link}
            href={`/${locale}/app/templates`}
          >
            {t('goTemplates')}
          </Link>
        ) : null}
      </div>

      {!writable || !canManageDocuments ? (
        <p className={styles.warn}>{t('readOnly')}</p>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {loading ? (
        <p className={styles.hint}>{t('loading')}</p>
      ) : items.length === 0 ? (
        <p className={styles.hint}>{t('empty')}</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id} className={styles.card}>
              <div>
                <p className={styles.name}>{item.title}</p>
                <p className={styles.meta}>
                  {t(`status_${item.status}` as 'status_draft')}
                </p>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() =>
                    router.push(`/${locale}/app/documents/${item.id}`)
                  }
                >
                  {t('open')}
                </button>
                {item.status === 'draft' ? (
                  <button
                    type="button"
                    className={styles.secondary}
                    disabled={!canMutate || busy}
                    onClick={() => void onWorkflow(item, 'submit')}
                  >
                    {t('workflowSubmit')}
                  </button>
                ) : null}
                {item.status === 'review' && isApprover ? (
                  <>
                    <button
                      type="button"
                      className={styles.secondary}
                      disabled={!canMutate || busy}
                      onClick={() => void onWorkflow(item, 'approve')}
                    >
                      {t('workflowApprove')}
                    </button>
                    <button
                      type="button"
                      className={styles.secondary}
                      disabled={!canMutate || busy}
                      onClick={() => void onWorkflow(item, 'reject')}
                    >
                      {t('workflowReject')}
                    </button>
                  </>
                ) : null}
                {item.status === 'approved' && isApprover ? (
                  <>
                    <button
                      type="button"
                      className={styles.secondary}
                      disabled={!canMutate || busy}
                      onClick={() => void onWorkflow(item, 'publish')}
                    >
                      {t('workflowPublish')}
                    </button>
                    <button
                      type="button"
                      className={styles.secondary}
                      disabled={!canMutate || busy}
                      onClick={() => void onWorkflow(item, 'reopen')}
                    >
                      {t('workflowReopen')}
                    </button>
                  </>
                ) : null}
                {item.status === 'published' && isApprover ? (
                  <button
                    type="button"
                    className={styles.secondary}
                    disabled={!canMutate || busy}
                    onClick={() => void onWorkflow(item, 'unpublish')}
                  >
                    {t('workflowUnpublish')}
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.danger}
                  disabled={!canMutate || busy}
                  onClick={() => void onDelete(item.id)}
                >
                  {t('delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
