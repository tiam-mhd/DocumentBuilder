'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { PublicDocumentWebPublish } from '@vdb/shared-types';
import {
  fetchDocumentWebPublish,
  updateDocumentWebPublish,
} from '@/shared/api/documents';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useMembershipPermissions } from '@/shared/lib/use-membership-permissions';
import { useEditorStore } from './store/editor-store';
import styles from './workflow-panel.module.css';

type Props = {
  businessId: string;
  documentId: string;
  disabled?: boolean;
};

export function WebPublishPanel({ businessId, documentId, disabled }: Props) {
  const t = useTranslations('editor');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const { canPublish } = useMembershipPermissions();
  const status = useEditorStore((s) => s.status);
  const [settings, setSettings] = useState<PublicDocumentWebPublish | null>(
    null,
  );
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchDocumentWebPublish(businessId, documentId);
        if (cancelled) return;
        setSettings(data);
        setSlug(data.webSlug ?? '');
      } catch {
        // ignore until panel open
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId, documentId, status]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!canPublish) return;
    setBusy(true);
    setError(null);
    try {
      const data = await updateDocumentWebPublish(businessId, documentId, {
        webSlug: slug.trim() || null,
        webPublished: settings?.webPublished ?? false,
      });
      setSettings(data);
      setSlug(data.webSlug ?? '');
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? mapApiErrorCode(err.code, tErrors)
          : tErrors('UNKNOWN'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(next: boolean) {
    if (!canPublish) return;
    setBusy(true);
    setError(null);
    try {
      const data = await updateDocumentWebPublish(businessId, documentId, {
        webSlug: slug.trim() || null,
        webPublished: next,
      });
      setSettings(data);
      setSlug(data.webSlug ?? '');
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? mapApiErrorCode(err.code, tErrors)
          : tErrors('UNKNOWN'),
      );
    } finally {
      setBusy(false);
    }
  }

  const publicHref =
    settings?.webPublished && settings.webSlug
      ? `/${locale}/p/${businessId}/${settings.webSlug}`
      : null;

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>{t('webPublishTitle')}</h3>
      <p className={styles.hint}>{t('webPublishHint')}</p>
      {error ? <p className={styles.error}>{error}</p> : null}

      <form className={styles.actions} onSubmit={(e) => void save(e)}>
        <label className={styles.field}>
          {t('webPublishSlug')}
          <input
            className={styles.input}
            value={slug}
            disabled={disabled || busy || !canPublish}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={t('webPublishSlugPlaceholder')}
          />
        </label>
        <button
          type="submit"
          className={styles.btnSecondary}
          disabled={disabled || busy || !canPublish}
        >
          {t('webPublishSaveSlug')}
        </button>
      </form>

      <div className={styles.actions}>
        {settings?.webPublished ? (
          <button
            type="button"
            className={styles.btn}
            disabled={disabled || busy || !canPublish}
            onClick={() => void togglePublish(false)}
          >
            {t('webPublishUnpublish')}
          </button>
        ) : (
          <button
            type="button"
            className={styles.btn}
            disabled={
              disabled ||
              busy ||
              !canPublish ||
              !(settings?.canPublishToWeb ?? false)
            }
            onClick={() => void togglePublish(true)}
          >
            {t('webPublishGoLive')}
          </button>
        )}
        {!settings?.canPublishToWeb ? (
          <p className={styles.meta}>{t('webPublishNeedApproved')}</p>
        ) : null}
        {publicHref ? (
          <p className={styles.meta}>
            <a href={publicHref} target="_blank" rel="noreferrer">
              {t('webPublishOpen')}
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
