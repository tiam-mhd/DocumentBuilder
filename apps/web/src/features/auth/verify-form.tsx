'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { verifyOtp } from '@/shared/api/auth';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useAuth } from '@/shared/lib/auth-context';
import { PENDING_DEV_CODE_KEY, PENDING_MOBILE_KEY } from './login-form';
import styles from './auth-forms.module.css';

export function VerifyForm({ locale }: { locale: string }) {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const { setSession } = useAuth();
  const [mobile, setMobile] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(PENDING_MOBILE_KEY);
    if (!stored) {
      router.replace(`/${locale}/login`);
      return;
    }
    setMobile(stored);
    setDevCode(sessionStorage.getItem(PENDING_DEV_CODE_KEY));
  }, [locale, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await verifyOtp(mobile, code.trim());
      sessionStorage.removeItem(PENDING_MOBILE_KEY);
      sessionStorage.removeItem(PENDING_DEV_CODE_KEY);
      setSession(result.accessToken, result.expiresInSeconds, result.user);
      router.replace(`/${locale}/app`);
    } catch (err) {
      const errCode =
        err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(errCode, tErrors));
    } finally {
      setLoading(false);
    }
  }

  if (!mobile) {
    return <p className={styles.hint}>{t('loading')}</p>;
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <h1 className={styles.title}>{t('verifyTitle')}</h1>
      <p className={styles.hint}>{t('verifyHint', { mobile })}</p>
      {devCode ? (
        <p className={styles.devHint}>{t('devCode', { code: devCode })}</p>
      ) : null}
      <label className={styles.field}>
        <span>{t('codeLabel')}</span>
        <input
          className={styles.input}
          type="text"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
      </label>
      {error ? <p className={styles.error}>{error}</p> : null}
      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? t('verifying') : t('verify')}
      </button>
      <button
        type="button"
        className={styles.linkButton}
        onClick={() => router.push(`/${locale}/login`)}
      >
        {t('changeMobile')}
      </button>
    </form>
  );
}
