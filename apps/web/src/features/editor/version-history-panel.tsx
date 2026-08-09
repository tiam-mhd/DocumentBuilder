'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type {
  PublicDocumentVersion,
  PublicDocumentVersionCompare,
} from '@vdb/shared-types';
import {
  cloneDocumentVersion,
  compareDocumentVersions,
  createDocumentVersion,
  getDocument,
  listDocumentVersions,
  restoreDocumentVersion,
} from '@/shared/api/documents';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useEditorStore } from './store/editor-store';
import styles from './version-history-panel.module.css';

type Props = {
  businessId: string;
  documentId: string;
  disabled?: boolean;
};

export function VersionHistoryPanel({
  businessId,
  documentId,
  disabled,
}: Props) {
  const t = useTranslations('editor');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const loadDocument = useEditorStore((s) => s.loadDocument);
  const setStatus = useEditorStore((s) => s.setStatus);

  const [items, setItems] = useState<PublicDocumentVersion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [compare, setCompare] = useState<PublicDocumentVersionCompare | null>(
    null,
  );

  const refresh = useCallback(async () => {
    const data = await listDocumentVersions(businessId, documentId);
    setItems(data.items);
  }, [businessId, documentId]);

  useEffect(() => {
    void refresh().catch(() => {
      /* list may fail until first version */
    });
  }, [refresh]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1]!, id];
      return [...prev, id];
    });
    setCompare(null);
  }

  async function onSnapshot() {
    setBusy(true);
    setError(null);
    try {
      await createDocumentVersion(businessId, documentId, {
        note: note.trim() || undefined,
      });
      setNote('');
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

  async function onCompare() {
    if (selected.length !== 2) return;
    setBusy(true);
    setError(null);
    try {
      const data = await compareDocumentVersions(
        businessId,
        documentId,
        selected[0]!,
        selected[1]!,
      );
      setCompare(data);
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

  async function onRestore(versionId: string) {
    if (!window.confirm(t('versionsRestoreConfirm'))) return;
    setBusy(true);
    setError(null);
    try {
      await restoreDocumentVersion(businessId, documentId, versionId);
      const doc = await getDocument(businessId, documentId);
      loadDocument({
        businessId,
        documentId: doc.id,
        title: doc.title,
        body: doc.body,
        status:
          doc.status === 'review' ||
          doc.status === 'approved' ||
          doc.status === 'published'
            ? doc.status
            : 'draft',
      });
      setStatus(
        doc.status === 'review' ||
          doc.status === 'approved' ||
          doc.status === 'published'
          ? doc.status
          : 'draft',
      );
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

  async function onClone(versionId: string) {
    setBusy(true);
    setError(null);
    try {
      const data = await cloneDocumentVersion(businessId, documentId, versionId);
      router.push(`/${locale}/app/documents/${data.documentId}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(mapApiErrorCode(err.code, tErrors));
      } else {
        setError(tErrors('UNKNOWN'));
      }
      setBusy(false);
    }
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>{t('versionsTitle')}</h3>
      <p className={styles.hint}>{t('versionsHint')}</p>
      {error ? <p className={styles.error}>{error}</p> : null}

      <label className={styles.field}>
        {t('versionsNote')}
        <input
          className={styles.input}
          value={note}
          disabled={disabled || busy}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('versionsNotePlaceholder')}
        />
      </label>
      <button
        type="button"
        className={styles.btn}
        disabled={disabled || busy}
        onClick={() => void onSnapshot()}
      >
        {t('versionsSnapshot')}
      </button>

      <button
        type="button"
        className={styles.btnSecondary}
        disabled={busy || selected.length !== 2}
        onClick={() => void onCompare()}
      >
        {t('versionsCompare')}
      </button>

      {compare ? (
        <ul className={styles.diffList}>
          {(
            [
              'title',
              'locale',
              'status',
              'pageCount',
              'blockCount',
              'masterCount',
              'schemaVersion',
            ] as const
          ).map((key) => (
            <li key={key} data-changed={compare.diff[key] ? '1' : '0'}>
              {t(`versionsDiff.${key}`)}:{' '}
              {compare.diff[key] ? t('versionsDiffChanged') : t('versionsDiffSame')}
            </li>
          ))}
          <li>
            v{compare.left.versionNumber} ↔ v{compare.right.versionNumber}
          </li>
        </ul>
      ) : null}

      {items.length === 0 ? (
        <p className={styles.hint}>{t('versionsEmpty')}</p>
      ) : (
        <ul className={styles.list}>
          {items.map((v) => (
            <li key={v.id} className={styles.item}>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={selected.includes(v.id)}
                  onChange={() => toggleSelect(v.id)}
                />
                <span>
                  v{v.versionNumber} · {v.source}
                  {v.note ? ` — ${v.note}` : ''}
                </span>
              </label>
              <p className={styles.meta}>
                {v.title} · {v.stats.blockCount} {t('versionsBlocks')} ·{' '}
                {new Date(v.createdAt).toLocaleString()}
              </p>
              <div className={styles.rowActions}>
                <button
                  type="button"
                  className={styles.linkBtn}
                  disabled={disabled || busy}
                  onClick={() => void onRestore(v.id)}
                >
                  {t('versionsRestore')}
                </button>
                <button
                  type="button"
                  className={styles.linkBtn}
                  disabled={disabled || busy}
                  onClick={() => void onClone(v.id)}
                >
                  {t('versionsClone')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
