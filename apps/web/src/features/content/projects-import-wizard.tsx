'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ImportJobStatus,
  PROJECT_IMPORT_FIELDS,
  type ImportColumnMapping,
  type ProjectImportFieldValue,
  type PublicImportJob,
} from '@vdb/shared-types';
import {
  commitImport,
  getImportJob,
  setImportMapping,
  uploadProjectsImport,
} from '@/shared/api/imports';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import styles from './projects-import-wizard.module.css';

type Step = 'upload' | 'map' | 'preview' | 'done';

const FIELD_ALIASES: Record<ProjectImportFieldValue, string[]> = {
  title: ['title', 'name', 'عنوان', 'نام'],
  description: ['description', 'desc', 'توضیح', 'شرح'],
  status: ['status', 'وضعیت'],
  category: ['category', 'دسته', 'categoryname'],
  location: ['location', 'مکان', 'locationname'],
  titleEn: ['titleen', 'title_en', 'title (en)'],
  descriptionEn: ['descriptionen', 'description_en', 'description (en)'],
  year: ['year', 'سال'],
};

function guessMapping(headers: string[]): ImportColumnMapping {
  const mapping: ImportColumnMapping = {};
  const used = new Set<string>();
  const normalized = headers.map((h) => ({
    raw: h,
    key: h.trim().toLowerCase().replace(/\s+/g, ''),
  }));
  for (const field of PROJECT_IMPORT_FIELDS) {
    const aliases = FIELD_ALIASES[field];
    const hit = normalized.find(
      (h) => !used.has(h.raw) && aliases.includes(h.key),
    );
    if (hit) {
      mapping[field] = hit.raw;
      used.add(hit.raw);
    }
  }
  return mapping;
}

type Props = {
  businessId: string;
  disabled?: boolean;
  onCompleted?: () => void;
};

export function ProjectsImportWizard({
  businessId,
  disabled,
  onCompleted,
}: Props) {
  const t = useTranslations('projectImport');
  const tErrors = useTranslations('errors');
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<PublicImportJob | null>(null);
  const [mapping, setMapping] = useState<ImportColumnMapping>({});

  useEffect(() => {
    if (!job) return;
    if (
      job.status !== ImportJobStatus.Queued &&
      job.status !== ImportJobStatus.Processing
    ) {
      return;
    }
    const timer = setInterval(async () => {
      try {
        const next = await getImportJob(businessId, job.id);
        setJob(next);
        if (
          next.status === ImportJobStatus.Completed ||
          next.status === ImportJobStatus.Failed
        ) {
          setStep('done');
          if (next.status === ImportJobStatus.Completed) {
            onCompleted?.();
          }
        }
      } catch {
        /* ignore poll errors briefly */
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [businessId, job, onCompleted]);

  function reset() {
    setStep('upload');
    setJob(null);
    setMapping({});
    setError(null);
    setBusy(false);
  }

  async function onUpload(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const data = await uploadProjectsImport(businessId, file);
      setJob(data);
      const guessed = guessMapping(data.preview?.headers ?? []);
      setMapping(guessed);
      setStep('map');
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

  async function onSaveMapping() {
    if (!job) return;
    if (!mapping.title) {
      setError(t('titleRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await setImportMapping(businessId, job.id, mapping);
      setJob(data);
      setStep('preview');
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
    if (!job) return;
    setBusy(true);
    setError(null);
    try {
      const data = await commitImport(businessId, job.id);
      setJob(data);
      if (
        data.status === ImportJobStatus.Queued ||
        data.status === ImportJobStatus.Processing
      ) {
        setStep('done');
      } else if (data.status === ImportJobStatus.Completed) {
        setStep('done');
        onCompleted?.();
      } else {
        setStep('done');
      }
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

  const headers = job?.preview?.headers ?? [];

  return (
    <div className={styles.wrap}>
      {!open ? (
        <button
          type="button"
          className={styles.openBtn}
          disabled={disabled}
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          {t('open')}
        </button>
      ) : (
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>{t('title')}</h2>
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              {t('close')}
            </button>
          </div>
          <p className={styles.hint}>{t('subtitle')}</p>
          {error ? <p className={styles.error}>{error}</p> : null}

          {step === 'upload' ? (
            <label className={styles.field}>
              {t('chooseFile')}
              <input
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={busy || disabled}
                onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
              />
            </label>
          ) : null}

          {step === 'map' && job ? (
            <div className={styles.mapGrid}>
              <p className={styles.meta}>
                {t('rows', { count: job.preview?.totalRows ?? 0 })} ·{' '}
                {job.originalFilename}
              </p>
              {PROJECT_IMPORT_FIELDS.map((field) => (
                <label key={field} className={styles.field}>
                  {t(`fields.${field}`)}
                  {field === 'title' ? ' *' : ''}
                  <select
                    className={styles.select}
                    value={mapping[field] ?? ''}
                    disabled={busy}
                    onChange={(e) => {
                      const v = e.target.value;
                      setMapping((prev) => {
                        const next = { ...prev };
                        if (!v) delete next[field];
                        else next[field] = v;
                        return next;
                      });
                    }}
                  >
                    <option value="">{t('skipColumn')}</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primary}
                  disabled={busy}
                  onClick={() => void onSaveMapping()}
                >
                  {busy ? t('working') : t('preview')}
                </button>
              </div>
            </div>
          ) : null}

          {step === 'preview' && job ? (
            <div className={styles.previewBlock}>
              <p className={styles.meta}>
                {t('previewSummary', {
                  total: job.preview?.totalRows ?? 0,
                  errors: job.preview?.errorCount ?? 0,
                })}
              </p>
              {(job.preview?.sampleErrors?.length ?? 0) > 0 ? (
                <ul className={styles.errorList}>
                  {job.preview!.sampleErrors.map((e) => (
                    <li key={`${e.row}-${e.code}-${e.message}`}>
                      {t('rowError', {
                        row: e.row,
                        message: e.message,
                      })}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.ok}>{t('noRowErrors')}</p>
              )}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.linkBtn}
                  disabled={busy}
                  onClick={() => setStep('map')}
                >
                  {t('backMap')}
                </button>
                <button
                  type="button"
                  className={styles.primary}
                  disabled={busy}
                  onClick={() => void onCommit()}
                >
                  {busy ? t('working') : t('commit')}
                </button>
              </div>
            </div>
          ) : null}

          {step === 'done' && job ? (
            <div className={styles.previewBlock}>
              <p className={styles.meta}>
                {t('status')}: {job.status}
              </p>
              {job.status === ImportJobStatus.Queued ||
              job.status === ImportJobStatus.Processing ? (
                <p className={styles.hint}>{t('queuedHint')}</p>
              ) : null}
              {job.result ? (
                <p className={styles.ok}>
                  {t('resultSummary', {
                    created: job.result.created,
                    skipped: job.result.skipped,
                  })}
                </p>
              ) : null}
              {job.errorMessage ? (
                <p className={styles.error}>{job.errorMessage}</p>
              ) : null}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={() => {
                    reset();
                    setStep('upload');
                  }}
                >
                  {t('importAgain')}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
