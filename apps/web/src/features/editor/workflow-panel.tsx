'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MembershipRole } from '@vdb/shared-types';
import {
  approveDocument,
  publishDocument,
  rejectDocument,
  reopenDocument,
  submitDocumentReview,
  unpublishDocument,
} from '@/shared/api/documents';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import { useEditorStore } from './store/editor-store';
import styles from './workflow-panel.module.css';

type Props = {
  businessId: string;
  documentId: string;
  disabled?: boolean;
};

export function WorkflowPanel({ businessId, documentId, disabled }: Props) {
  const t = useTranslations('editor');
  const tErrors = useTranslations('errors');
  const { activeBusiness } = useBusinesses();
  const status = useEditorStore((s) => s.status);
  const setStatus = useEditorStore((s) => s.setStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const role = activeBusiness?.role;
  const isApprover =
    role === MembershipRole.Owner || role === MembershipRole.Admin;

  async function run(
    fn: () => Promise<{ status: string }>,
  ): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const doc = await fn();
      const next =
        doc.status === 'review' ||
        doc.status === 'approved' ||
        doc.status === 'published'
          ? doc.status
          : 'draft';
      setStatus(next);
      setRejectNote('');
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

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>{t('workflowTitle')}</h3>
      <p className={styles.meta}>
        {t('workflowStatus')}: {t(`status_${status}`)}
      </p>
      <p className={styles.hint}>{t('workflowHint')}</p>
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.actions}>
        {status === 'draft' ? (
          <button
            type="button"
            className={styles.btn}
            disabled={disabled || busy}
            onClick={() =>
              void run(() => submitDocumentReview(businessId, documentId))
            }
          >
            {t('workflowSubmit')}
          </button>
        ) : null}

        {status === 'review' && isApprover ? (
          <>
            <button
              type="button"
              className={styles.btn}
              disabled={disabled || busy}
              onClick={() =>
                void run(() => approveDocument(businessId, documentId))
              }
            >
              {t('workflowApprove')}
            </button>
            <label className={styles.field}>
              {t('workflowRejectNote')}
              <input
                className={styles.input}
                value={rejectNote}
                disabled={disabled || busy}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </label>
            <button
              type="button"
              className={styles.btnSecondary}
              disabled={disabled || busy}
              onClick={() =>
                void run(() =>
                  rejectDocument(businessId, documentId, rejectNote || undefined),
                )
              }
            >
              {t('workflowReject')}
            </button>
          </>
        ) : null}

        {status === 'review' && !isApprover ? (
          <p className={styles.hint}>{t('workflowWaitingApprover')}</p>
        ) : null}

        {status === 'approved' && isApprover ? (
          <>
            <button
              type="button"
              className={styles.btn}
              disabled={disabled || busy}
              onClick={() =>
                void run(() => publishDocument(businessId, documentId))
              }
            >
              {t('workflowPublish')}
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              disabled={disabled || busy}
              onClick={() =>
                void run(() => reopenDocument(businessId, documentId))
              }
            >
              {t('workflowReopen')}
            </button>
          </>
        ) : null}

        {status === 'published' && isApprover ? (
          <button
            type="button"
            className={styles.btnSecondary}
            disabled={disabled || busy}
            onClick={() =>
              void run(() => unpublishDocument(businessId, documentId))
            }
          >
            {t('workflowUnpublish')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
