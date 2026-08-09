'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AuditActions, MembershipRole } from '@vdb/shared-types';
import type { PublicAuditEvent } from '@vdb/shared-types';
import { listAuditEvents } from '@/shared/api/audit';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import styles from './audit-page.module.css';

const ACTION_OPTIONS = [
  '',
  AuditActions.AuthLogin,
  AuditActions.BusinessCreate,
  AuditActions.BusinessDelete,
  AuditActions.BillingPaymentSucceeded,
  AuditActions.BillingLicenseActivated,
  AuditActions.ExportPdfEnqueued,
  AuditActions.DocumentDelete,
  AuditActions.DocumentWorkflowSubmit,
  AuditActions.DocumentWorkflowApprove,
  AuditActions.DocumentWorkflowReject,
  AuditActions.DocumentWorkflowPublish,
  AuditActions.DocumentWorkflowUnpublish,
  AuditActions.DocumentWorkflowReopen,
  AuditActions.WorkspaceBackupCompleted,
  AuditActions.WorkspaceRestoreCompleted,
] as const;

export function AuditPage() {
  const t = useTranslations('audit');
  const tErrors = useTranslations('errors');
  const { activeBusiness } = useBusinesses();
  const [items, setItems] = useState<PublicAuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isApprover =
    activeBusiness?.role === MembershipRole.Owner ||
    activeBusiness?.role === MembershipRole.Admin;

  async function refresh(nextPage = page) {
    if (!activeBusiness || !isApprover) {
      setItems([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listAuditEvents(activeBusiness.id, {
        page: nextPage,
        pageSize: 25,
        action: action || undefined,
        entityType: entityType.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setItems(data.items);
      setTotal(data.total);
      setPage(data.page);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(mapApiErrorCode(err.code, tErrors));
      } else {
        setError(tErrors('UNKNOWN'));
      }
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusiness?.id, isApprover]);

  function onFilter(event: FormEvent) {
    event.preventDefault();
    void refresh(1);
  }

  function actionLabel(code: string): string {
    const key = code.replace(/\./g, '_');
    try {
      return t(`actions.${key}` as never);
    } catch {
      return code;
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

  if (!isApprover) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.hint}>{t('ownerOnly')}</p>
      </section>
    );
  }

  const pageCount = Math.max(1, Math.ceil(total / 25));

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.hint}>{t('hint')}</p>

      <form className={styles.filters} onSubmit={onFilter}>
        <label className={styles.field}>
          <span>{t('filterAction')}</span>
          <select
            className={styles.input}
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            {ACTION_OPTIONS.map((code) => (
              <option key={code || 'all'} value={code}>
                {code ? actionLabel(code) : t('filterActionAll')}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>{t('filterEntityType')}</span>
          <input
            className={styles.input}
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            placeholder={t('filterEntityTypePlaceholder')}
          />
        </label>
        <label className={styles.field}>
          <span>{t('filterFrom')}</span>
          <input
            className={styles.input}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>{t('filterTo')}</span>
          <input
            className={styles.input}
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button type="submit" className={styles.primary} disabled={loading}>
          {t('applyFilters')}
        </button>
      </form>

      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p className={styles.hint}>{t('loading')}</p> : null}

      {!loading && items.length === 0 ? (
        <p className={styles.hint}>{t('empty')}</p>
      ) : null}

      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.item}>
            <div className={styles.itemHead}>
              <strong>{actionLabel(item.action)}</strong>
              <time dateTime={item.createdAt}>
                {new Date(item.createdAt).toLocaleString()}
              </time>
            </div>
            <div className={styles.meta}>
              <span>
                {t('entity')}: {item.entityType}
                {item.entityId ? ` · ${item.entityId}` : ''}
              </span>
              {item.userId ? (
                <span>
                  {t('actor')}: {item.userId}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {total > 25 ? (
        <div className={styles.pager}>
          <button
            type="button"
            className={styles.secondary}
            disabled={loading || page <= 1}
            onClick={() => void refresh(page - 1)}
          >
            {t('prev')}
          </button>
          <span>
            {t('pageOf', { page, pageCount })}
          </span>
          <button
            type="button"
            className={styles.secondary}
            disabled={loading || page >= pageCount}
            onClick={() => void refresh(page + 1)}
          >
            {t('next')}
          </button>
        </div>
      ) : null}
    </section>
  );
}
