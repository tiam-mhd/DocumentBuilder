'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PublicExportJob } from '@vdb/shared-types';
import {
  createPdfExport,
  downloadExportPdf,
  getExportJob,
} from '@/shared/api/exports';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useEditorStore } from './store/editor-store';
import styles from './export-panel.module.css';

type Props = {
  disabled: boolean;
  canExport: boolean;
};

export function ExportPanel({ disabled, canExport }: Props) {
  const t = useTranslations('editor');
  const tErrors = useTranslations('errors');
  const businessId = useEditorStore((s) => s.businessId);
  const documentId = useEditorStore((s) => s.documentId);
  const [job, setJob] = useState<PublicExportJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!job || !businessId) return;
    if (job.status === 'completed' || job.status === 'failed') return;
    const timer = setInterval(() => {
      void (async () => {
        try {
          const next = await getExportJob(businessId, job.id);
          setJob(next);
        } catch {
          // keep polling until timeout UX — next click can retry
        }
      })();
    }, 1500);
    return () => clearInterval(timer);
  }, [job, businessId]);

  async function onExport() {
    if (!businessId || !documentId) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createPdfExport(businessId, documentId);
      setJob(created);
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

  async function onDownload() {
    if (!businessId || !job) return;
    setBusy(true);
    setError(null);
    try {
      await downloadExportPdf(
        businessId,
        job.id,
        `document-${job.documentId}.pdf`,
      );
    } catch {
      setError(t('exportDownloadFailed'));
    } finally {
      setBusy(false);
    }
  }

  const statusLabel =
    job?.status === 'queued'
      ? t('exportQueued')
      : job?.status === 'processing'
        ? t('exportProcessing')
        : job?.status === 'completed'
          ? t('exportCompleted')
          : job?.status === 'failed'
            ? t('exportFailed')
            : null;

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>{t('exportTitle')}</h2>
      <p className={styles.hint}>{t('exportHint')}</p>
      {!canExport ? (
        <p className={styles.warn}>{t('exportNoEntitlement')}</p>
      ) : null}
      <button
        type="button"
        className={styles.primary}
        disabled={disabled || !canExport || busy}
        onClick={() => void onExport()}
      >
        {busy ? t('exportStarting') : t('exportPdf')}
      </button>
      {statusLabel ? <p className={styles.status}>{statusLabel}</p> : null}
      {job?.status === 'failed' && job.errorMessage ? (
        <p className={styles.warn}>{job.errorMessage}</p>
      ) : null}
      {job?.status === 'completed' ? (
        <button
          type="button"
          className={styles.secondary}
          disabled={busy}
          onClick={() => void onDownload()}
        >
          {t('exportDownload')}
        </button>
      ) : null}
      {error ? <p className={styles.warn}>{error}</p> : null}
    </div>
  );
}
