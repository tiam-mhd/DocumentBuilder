'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { PublicDocumentShareLink } from '@vdb/shared-types';
import {
  createDocumentShareLink,
  listDocumentShareLinks,
  revokeDocumentShareLink,
} from '@/shared/api/share-links';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useMembershipPermissions } from '@/shared/lib/use-membership-permissions';
import { useEditorStore } from './store/editor-store';
import styles from './workflow-panel.module.css';

type Props = {
  businessId: string;
  documentId: string;
  disabled?: boolean;
};

export function ShareLinksPanel({ businessId, documentId, disabled }: Props) {
  const t = useTranslations('editor');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const { canPublish } = useMembershipPermissions();
  const status = useEditorStore((s) => s.status);
  const [items, setItems] = useState<PublicDocumentShareLink[]>([]);
  const [scope, setScope] = useState<'web' | 'pdf'>('web');
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const data = await listDocumentShareLinks(businessId, documentId);
    setItems(data.items);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listDocumentShareLinks(businessId, documentId);
        if (!cancelled) setItems(data.items);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId, documentId, status]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!canPublish) return;
    setBusy(true);
    setError(null);
    setCreatedToken(null);
    try {
      const data = await createDocumentShareLink(businessId, documentId, {
        scope,
        password: password.trim() || null,
        expiresAt: expiresAt.trim()
          ? new Date(expiresAt).toISOString()
          : null,
      });
      setCreatedToken(data.token ?? null);
      setPassword('');
      await refresh();
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

  async function onRevoke(shareId: string) {
    if (!canPublish) return;
    setBusy(true);
    setError(null);
    try {
      await revokeDocumentShareLink(businessId, documentId, shareId);
      await refresh();
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

  const canCreate =
    status === 'approved' || status === 'published';

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>{t('shareLinksTitle')}</h3>
      <p className={styles.hint}>{t('shareLinksHint')}</p>
      {error ? <p className={styles.error}>{error}</p> : null}

      <form className={styles.actions} onSubmit={(e) => void onCreate(e)}>
        <label className={styles.field}>
          {t('shareLinksScope')}
          <select
            className={styles.input}
            value={scope}
            disabled={disabled || busy || !canPublish}
            onChange={(e) =>
              setScope(e.target.value === 'pdf' ? 'pdf' : 'web')
            }
          >
            <option value="web">{t('shareLinksScopeWeb')}</option>
            <option value="pdf">{t('shareLinksScopePdf')}</option>
          </select>
        </label>
        <label className={styles.field}>
          {t('shareLinksPassword')}
          <input
            className={styles.input}
            type="password"
            value={password}
            disabled={disabled || busy || !canPublish}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('shareLinksPasswordOptional')}
            autoComplete="new-password"
          />
        </label>
        <label className={styles.field}>
          {t('shareLinksExpires')}
          <input
            className={styles.input}
            type="datetime-local"
            value={expiresAt}
            disabled={disabled || busy || !canPublish}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className={styles.btn}
          disabled={disabled || busy || !canPublish || !canCreate}
        >
          {t('shareLinksCreate')}
        </button>
        {!canCreate ? (
          <p className={styles.meta}>{t('shareLinksNeedApproved')}</p>
        ) : null}
      </form>

      {createdToken ? (
        <p className={styles.meta}>
          {t('shareLinksCreatedOnce')}{' '}
          <a
            href={`/${locale}/s/${createdToken}`}
            target="_blank"
            rel="noreferrer"
          >
            {`/${locale}/s/${createdToken}`}
          </a>
        </p>
      ) : null}

      <ul className={styles.actions}>
        {items.length === 0 ? (
          <li className={styles.meta}>{t('shareLinksEmpty')}</li>
        ) : (
          items.map((item) => (
            <li key={item.id} className={styles.meta}>
              …{item.tokenHint} · {item.scope}
              {item.hasPassword ? ` · ${t('shareLinksHasPassword')}` : ''}
              {item.revokedAt
                ? ` · ${t('shareLinksRevoked')}`
                : item.expiresAt
                  ? ` · ${t('shareLinksExpiresAt', { at: item.expiresAt })}`
                  : ''}
              {!item.revokedAt ? (
                <>
                  {' '}
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    disabled={disabled || busy || !canPublish}
                    onClick={() => void onRevoke(item.id)}
                  >
                    {t('shareLinksRevoke')}
                  </button>
                </>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
