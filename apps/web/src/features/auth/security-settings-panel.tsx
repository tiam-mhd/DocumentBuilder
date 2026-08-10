'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { setPassword, setTwoFactorEnabled } from '@/shared/api/auth';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useAuth } from '@/shared/lib/auth-context';
import styles from './auth-forms.module.css';

export function SecuritySettingsPanel({
  hideHeading = false,
}: {
  hideHeading?: boolean;
}) {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const { user, refreshMe } = useAuth();
  const [password, setPasswordValue] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!user) return null;
  const account = user;

  async function onSetPassword(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await setPassword(
        password,
        account.hasPassword ? currentPassword || undefined : undefined,
      );
      setPasswordValue('');
      setCurrentPassword('');
      await refreshMe();
      setSuccess(t('passwordSaved'));
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setLoading(false);
    }
  }

  async function onToggleTwoFactor() {
    setToggleLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await setTwoFactorEnabled(!account.twoFactorEnabled);
      await refreshMe();
      setSuccess(
        !account.twoFactorEnabled
          ? t('twoFactorEnabled')
          : t('twoFactorDisabled'),
      );
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setToggleLoading(false);
    }
  }

  return (
    <section className={styles.securityCard}>
      {hideHeading ? null : (
        <>
          <h2 className={styles.title}>{t('securityTitle')}</h2>
          <p className={styles.hint}>{t('securityHint')}</p>
        </>
      )}

      <form className={styles.form} onSubmit={onSetPassword}>
        {account.hasPassword ? (
          <label className={styles.field}>
            <span>{t('currentPasswordLabel')}</span>
            <input
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
        ) : null}
        <label className={styles.field}>
          <span>
            {account.hasPassword ? t('newPasswordLabel') : t('passwordLabel')}
          </span>
          <input
            className={styles.input}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPasswordValue(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <p className={styles.hint}>{t('passwordRules')}</p>
        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? t('saving') : t('savePassword')}
        </button>
      </form>

      <div className={styles.securityRow}>
        <div>
          <p className={styles.methodTitle}>{t('twoFactorToggle')}</p>
          <p className={styles.methodDesc}>{t('twoFactorToggleHint')}</p>
        </div>
        <button
          type="button"
          className={styles.toggle}
          data-on={account.twoFactorEnabled ? 'true' : 'false'}
          aria-pressed={account.twoFactorEnabled}
          disabled={toggleLoading || !account.hasPassword}
          onClick={() => void onToggleTwoFactor()}
          title={
            !account.hasPassword ? t('twoFactorNeedsPassword') : undefined
          }
        />
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {success ? <p className={styles.success}>{success}</p> : null}
    </section>
  );
}
