'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PublicInstallationLicense } from '@vdb/shared-types';
import {
  activateInstallationLicense,
  fetchInstallationLicense,
} from '@/shared/api/license';
import { fetchSystemConfig } from '@/shared/api/system';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import styles from './license-page.module.css';

export function LicensePage() {
  const t = useTranslations('license');
  const tErrors = useTranslations('errors');
  const [allowed, setAllowed] = useState(false);
  const [status, setStatus] = useState<PublicInstallationLicense | null>(null);
  const [key, setKey] = useState('');
  const [org, setOrg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const config = await fetchSystemConfig();
        if (!cancelled) {
          setAllowed(config.licenseActivation);
        }
        if (config.licenseActivation) {
          const license = await fetchInstallationLicense();
          if (!cancelled) setStatus(license);
        }
      } catch (err) {
        if (!cancelled) {
          const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
          setError(mapApiErrorCode(code, tErrors));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tErrors]);

  async function onActivate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const next = await activateInstallationLicense({
        licenseKey: key,
        organizationName: org.trim() || undefined,
      });
      setStatus(next);
      setKey('');
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className={styles.hint}>{t('loading')}</p>;
  }

  if (!allowed) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.hint}>{t('saasOnly')}</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.hint}>{t('hint')}</p>

      {status?.active ? (
        <div className={styles.card}>
          <p className={styles.ok}>{t('active')}</p>
          <p className={styles.meta}>
            {t('org', { name: status.organizationName ?? t('orgUnknown') })}
          </p>
          <p className={styles.meta}>
            {t('hintKey', { hint: status.keyHint ?? '—' })}
          </p>
          {status.expiresAt ? (
            <p className={styles.meta}>
              {t('expires', {
                date: new Date(status.expiresAt).toLocaleString(),
              })}
            </p>
          ) : (
            <p className={styles.meta}>{t('noExpiry')}</p>
          )}
        </div>
      ) : (
        <form className={styles.form} onSubmit={(e) => void onActivate(e)}>
          <p className={styles.warn}>{t('required')}</p>
          <label className={styles.label}>
            {t('keyLabel')}
            <input
              className={styles.input}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="off"
              required
              minLength={8}
              placeholder={t('keyPlaceholder')}
            />
          </label>
          <label className={styles.label}>
            {t('orgLabel')}
            <input
              className={styles.input}
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder={t('orgPlaceholder')}
            />
          </label>
          {error ? <p className={styles.error}>{error}</p> : null}
          <button type="submit" className={styles.cta} disabled={busy || !key}>
            {busy ? t('activating') : t('activate')}
          </button>
        </form>
      )}
    </section>
  );
}
