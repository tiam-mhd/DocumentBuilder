'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { requestOtp } from '@/shared/api/auth';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import styles from './auth-forms.module.css';

export const PENDING_MOBILE_KEY = 'vdb_otp_mobile';
export const PENDING_DEV_CODE_KEY = 'vdb_otp_dev_code';

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await requestOtp(mobile.trim());
      sessionStorage.setItem(PENDING_MOBILE_KEY, result.mobile);
      if (result.devCode) {
        sessionStorage.setItem(PENDING_DEV_CODE_KEY, result.devCode);
      } else {
        sessionStorage.removeItem(PENDING_DEV_CODE_KEY);
      }
      router.push(`/${locale}/verify`);
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <h1 className={styles.title}>{t('loginTitle')}</h1>
      <p className={styles.hint}>{t('loginHint')}</p>
      <label className={styles.field}>
        <span>{t('mobileLabel')}</span>
        <input
          className={styles.input}
          type="tel"
          name="mobile"
          autoComplete="tel"
          inputMode="tel"
          placeholder={t('mobilePlaceholder')}
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          required
        />
      </label>
      {error ? <p className={styles.error}>{error}</p> : null}
      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? t('sending') : t('sendCode')}
      </button>
    </form>
  );
}
