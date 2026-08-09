'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MembershipRole } from '@vdb/shared-types';
import type {
  PublicWorkspaceBackupJob,
  PublicWorkspaceRestoreJob,
} from '@vdb/shared-types';
import {
  commitRestore,
  createBackup,
  downloadBackupFile,
  getBackup,
  getRestore,
  listBackups,
  uploadRestorePackage,
} from '@/shared/api/backup';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import styles from './backup-page.module.css';

export function BackupPage() {
  const t = useTranslations('backup');
  const tErrors = useTranslations('errors');
  const { activeBusiness } = useBusinesses();
  const [backups, setBackups] = useState<PublicWorkspaceBackupJob[]>([]);
  const [restore, setRestore] = useState<PublicWorkspaceRestoreJob | null>(
    null,
  );
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isOwner = activeBusiness?.role === MembershipRole.Owner;

  async function refreshBackups() {
    if (!activeBusiness || !isOwner) {
      setBackups([]);
      return;
    }
    try {
      const data = await listBackups(activeBusiness.id, {
        page: 1,
        pageSize: 20,
      });
      setBackups(data.items);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(mapApiErrorCode(err.code, tErrors));
      }
    }
  }

  useEffect(() => {
    void refreshBackups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusiness?.id, isOwner]);

  useEffect(() => {
    if (!activeBusiness || !restore) return;
    if (
      restore.status !== 'queued' &&
      restore.status !== 'processing' &&
      restore.status !== 'uploaded'
    ) {
      return;
    }
    if (restore.status === 'uploaded') return;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const next = await getRestore(activeBusiness.id, restore.id);
          setRestore(next);
          if (next.status === 'completed' || next.status === 'failed') {
            await refreshBackups();
          }
        } catch {
          /* ignore poll errors */
        }
      })();
    }, 1500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusiness?.id, restore?.id, restore?.status]);

  useEffect(() => {
    if (!activeBusiness) return;
    const processing = backups.find(
      (b) => b.status === 'queued' || b.status === 'processing',
    );
    if (!processing) return;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const next = await getBackup(activeBusiness.id, processing.id);
          setBackups((prev) =>
            prev.map((b) => (b.id === next.id ? next : b)),
          );
        } catch {
          /* ignore */
        }
      })();
    }, 1500);
    return () => window.clearInterval(id);
  }, [activeBusiness?.id, backups]);

  async function onCreateBackup() {
    if (!activeBusiness) return;
    setBusy(true);
    setError(null);
    try {
      const job = await createBackup(activeBusiness.id);
      setBackups((prev) => [job, ...prev]);
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

  async function onDownload(jobId: string) {
    if (!activeBusiness) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await downloadBackupFile(activeBusiness.id, jobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${activeBusiness.id.slice(0, 8)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
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

  async function onUpload(file: File | null) {
    if (!activeBusiness || !file) return;
    setBusy(true);
    setError(null);
    setConfirmReplace(false);
    try {
      const job = await uploadRestorePackage(activeBusiness.id, file);
      setRestore(job);
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

  async function onCommit() {
    if (!activeBusiness || !restore) return;
    setBusy(true);
    setError(null);
    try {
      const job = await commitRestore(
        activeBusiness.id,
        restore.id,
        confirmReplace,
      );
      setRestore(job);
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

  if (!isOwner) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.hint}>{t('ownerOnly')}</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.hint}>{t('hint')}</p>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.block}>
        <h2 className={styles.subtitle}>{t('backupSection')}</h2>
        <button
          type="button"
          className={styles.primary}
          disabled={busy}
          onClick={() => void onCreateBackup()}
        >
          {t('createBackup')}
        </button>
        <ul className={styles.list}>
          {backups.map((job) => (
            <li key={job.id} className={styles.item}>
              <div className={styles.itemHead}>
                <strong>{job.status}</strong>
                <time dateTime={job.createdAt}>
                  {new Date(job.createdAt).toLocaleString()}
                </time>
              </div>
              {job.manifest ? (
                <p className={styles.meta}>
                  {t('countsSummary', {
                    documents: job.manifest.counts.documents,
                    media: job.manifest.counts.mediaAssets,
                  })}
                </p>
              ) : null}
              {job.status === 'completed' ? (
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() => void onDownload(job.id)}
                >
                  {t('download')}
                </button>
              ) : null}
              {job.errorMessage ? (
                <p className={styles.error}>{job.errorMessage}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.block}>
        <h2 className={styles.subtitle}>{t('restoreSection')}</h2>
        <p className={styles.hint}>{t('restoreHint')}</p>
        <input
          type="file"
          accept=".zip,application/zip"
          disabled={busy}
          onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
        />

        {restore ? (
          <div className={styles.preview}>
            <p>
              <strong>{t('previewStatus')}:</strong> {restore.status}
            </p>
            {restore.preview ? (
              <>
                <p>
                  {t('previewSource', {
                    name: restore.preview.source.name,
                    version: restore.preview.formatVersion,
                  })}
                </p>
                <p>
                  {t('countsSummary', {
                    documents: restore.preview.counts.documents,
                    media: restore.preview.counts.mediaAssets,
                  })}
                </p>
              </>
            ) : null}
            {restore.targetEmpty === false ? (
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={confirmReplace}
                  onChange={(e) => setConfirmReplace(e.target.checked)}
                  disabled={restore.status !== 'uploaded'}
                />
                {t('confirmReplace')}
              </label>
            ) : (
              <p className={styles.hint}>{t('targetEmpty')}</p>
            )}
            {restore.status === 'uploaded' ? (
              <button
                type="button"
                className={styles.primary}
                disabled={
                  busy ||
                  (restore.targetEmpty === false && !confirmReplace)
                }
                onClick={() => void onCommit()}
              >
                {t('commitRestore')}
              </button>
            ) : null}
            {restore.result ? (
              <p className={styles.hint}>
                {t('restoreDone', {
                  count: restore.result.remappedEntities,
                })}
              </p>
            ) : null}
            {restore.errorMessage ? (
              <p className={styles.error}>{restore.errorMessage}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
