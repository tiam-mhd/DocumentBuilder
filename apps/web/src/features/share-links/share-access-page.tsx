'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type {
  PublicShareLinkMeta,
  PublicShareLinkPdfView,
  PublicShareLinkWebView,
} from '@vdb/shared-types';
import { ApiClientError, getApiBaseUrl, mapApiErrorCode } from '@/shared/api/client';
import { resolveShareLink, unlockShareLink } from '@/shared/api/share-links';
import { PublicWebDocumentView } from '@/features/web-publish/public-web-document-view';
import styles from './share-access-page.module.css';

type Props = { token: string };

export function ShareAccessPage({ token }: Props) {
  const t = useTranslations('shareAccess');
  const tErrors = useTranslations('errors');
  const [meta, setMeta] = useState<PublicShareLinkMeta | null>(null);
  const [view, setView] = useState<
    PublicShareLinkWebView | PublicShareLinkPdfView | null
  >(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await resolveShareLink(token);
        if (cancelled) return;
        setMeta(data.meta);
        if ('view' in data) setView(data.view);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? mapApiErrorCode(err.code, tErrors)
              : tErrors('UNKNOWN'),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, tErrors]);

  async function onUnlock(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await unlockShareLink(token, password);
      setMeta(data.meta);
      setView(data.view);
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

  if (loading) {
    return (
      <main className={styles.wrap}>
        <p>{t('loading')}</p>
      </main>
    );
  }

  if (!meta) {
    return (
      <main className={styles.wrap}>
        <h1>{t('unavailableTitle')}</h1>
        <p>{error ?? t('unavailableBody')}</p>
      </main>
    );
  }

  if (meta.revoked || meta.expired) {
    return (
      <main className={styles.wrap}>
        <h1>{t('unavailableTitle')}</h1>
        <p>{meta.revoked ? t('revoked') : t('expired')}</p>
      </main>
    );
  }

  if (meta.requiresPassword && !meta.unlocked && !view) {
    return (
      <main className={styles.wrap}>
        <h1>{meta.title}</h1>
        <p>{t('passwordHint')}</p>
        {error ? <p className={styles.error}>{error}</p> : null}
        <form className={styles.form} onSubmit={(e) => void onUnlock(e)}>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('password')}
            autoComplete="current-password"
          />
          <button type="submit" className={styles.btn} disabled={busy}>
            {t('unlock')}
          </button>
        </form>
      </main>
    );
  }

  if (!view) {
    return (
      <main className={styles.wrap}>
        <h1>{meta.title}</h1>
        <p>{error ?? t('unavailableBody')}</p>
      </main>
    );
  }

  if (view.scope === 'pdf') {
    const href = view.filePath.startsWith('http')
      ? view.filePath
      : `${getApiBaseUrl().replace(/\/api$/, '')}${view.filePath}`;
    return (
      <main className={styles.wrap}>
        <h1>{view.title}</h1>
        <p>{t('pdfReady')}</p>
        <a className={styles.btn} href={href}>
          {t('downloadPdf')}
        </a>
      </main>
    );
  }

  return (
    <PublicWebDocumentView
      data={{
        businessId: view.businessId,
        documentId: view.documentId,
        slug: token,
        title: view.title,
        locale: view.locale,
        dir: view.dir,
        html: view.html,
        branding: view.branding,
      }}
      poweredByLabel={t('poweredBy')}
    />
  );
}
