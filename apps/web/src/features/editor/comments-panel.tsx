'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PublicDocumentComment } from '@vdb/shared-types';
import { getPrimaryPage } from '@vdb/document-schema';
import {
  createDocumentComment,
  deleteDocumentComment,
  listDocumentComments,
  resolveDocumentComment,
  unresolveDocumentComment,
} from '@/shared/api/documents';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useEditorStore } from './store/editor-store';
import styles from './comments-panel.module.css';

type Props = {
  businessId: string;
  documentId: string;
  disabled?: boolean;
};

export function CommentsPanel({ businessId, documentId, disabled }: Props) {
  const t = useTranslations('editor');
  const tErrors = useTranslations('errors');
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId);
  const body = useEditorStore((s) => s.body);
  const [items, setItems] = useState<PublicDocumentComment[]>([]);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anchorSelected, setAnchorSelected] = useState(true);

  const refresh = useCallback(async () => {
    const data = await listDocumentComments(businessId, documentId, {
      resolved: filter,
    });
    setItems(data.items);
    setUnresolvedCount(data.unresolvedCount);
  }, [businessId, documentId, filter]);

  useEffect(() => {
    void refresh().catch(() => {
      /* ignore */
    });
  }, [refresh]);

  async function onCreate() {
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const pageId = body ? getPrimaryPage(body).id : null;
      await createDocumentComment(businessId, documentId, {
        body: draft.trim(),
        pageId,
        blockId: anchorSelected ? selectedBlockId : null,
      });
      setDraft('');
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

  async function onResolve(id: string, resolved: boolean) {
    setBusy(true);
    setError(null);
    try {
      if (resolved) {
        await unresolveDocumentComment(businessId, documentId, id);
      } else {
        await resolveDocumentComment(businessId, documentId, id);
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
    if (!window.confirm(t('commentsDeleteConfirm'))) return;
    setBusy(true);
    setError(null);
    try {
      await deleteDocumentComment(businessId, documentId, id);
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

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>{t('commentsTitle')}</h3>
      <p className={styles.hint}>{t('commentsHint')}</p>
      <p className={styles.meta}>
        {t('commentsOpenCount', { count: unresolvedCount })}
      </p>
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.filters}>
        {(['open', 'all', 'resolved'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={styles.filterBtn}
            data-active={filter === f ? '1' : '0'}
            disabled={busy}
            onClick={() => setFilter(f)}
          >
            {t(`commentsFilter_${f}`)}
          </button>
        ))}
      </div>

      <label className={styles.field}>
        {t('commentsBody')}
        <textarea
          className={styles.textarea}
          rows={3}
          value={draft}
          disabled={disabled || busy}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('commentsPlaceholder')}
        />
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={anchorSelected}
          disabled={disabled || busy || !selectedBlockId}
          onChange={(e) => setAnchorSelected(e.target.checked)}
        />
        {selectedBlockId
          ? t('commentsAnchorBlock', { id: selectedBlockId })
          : t('commentsAnchorNone')}
      </label>
      <button
        type="button"
        className={styles.btn}
        disabled={disabled || busy || !draft.trim()}
        onClick={() => void onCreate()}
      >
        {t('commentsAdd')}
      </button>

      <ul className={styles.list}>
        {items.length === 0 ? (
          <li className={styles.hint}>{t('commentsEmpty')}</li>
        ) : (
          items.map((c) => (
            <li
              key={c.id}
              className={styles.item}
              data-resolved={c.resolvedAt ? '1' : '0'}
            >
              <p className={styles.body}>{c.body}</p>
              <p className={styles.meta}>
                {c.blockId
                  ? t('commentsOnBlock', { id: c.blockId })
                  : t('commentsOnDoc')}
                {' · '}
                {new Date(c.createdAt).toLocaleString()}
                {c.resolvedAt ? ` · ${t('commentsResolved')}` : ''}
              </p>
              <div className={styles.rowActions}>
                <button
                  type="button"
                  className={styles.linkBtn}
                  disabled={disabled || busy}
                  onClick={() => void onResolve(c.id, Boolean(c.resolvedAt))}
                >
                  {c.resolvedAt ? t('commentsUnresolve') : t('commentsResolve')}
                </button>
                <button
                  type="button"
                  className={styles.linkBtn}
                  disabled={disabled || busy}
                  onClick={() => void onDelete(c.id)}
                >
                  {t('commentsDelete')}
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
