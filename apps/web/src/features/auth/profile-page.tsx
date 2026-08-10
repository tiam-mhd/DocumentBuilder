'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { updateProfile } from '@/shared/api/auth';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useAuth } from '@/shared/lib/auth-context';
import { SecuritySettingsPanel } from '@/features/auth/security-settings-panel';
import styles from './profile-page.module.css';

type SectionId = 'identity' | 'security' | 'shortcuts';

export function ProfilePage() {
  const t = useTranslations('profile');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const { user, refreshMe, logout } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    identity: true,
    security: false,
    shortcuts: true,
  });

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName ?? '');
    setEmail(user.email ?? '');
    setJobTitle(user.jobTitle ?? '');
    setBio(user.bio ?? '');
  }, [user]);

  if (!user) return null;

  const initial = (user.displayName?.trim() || user.mobile || '?')
    .charAt(0)
    .toUpperCase();

  function toggle(id: SectionId) {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await updateProfile({
        displayName: displayName.trim() || null,
        email: email.trim() || null,
        jobTitle: jobTitle.trim() || null,
        bio: bio.trim() || null,
      });
      await refreshMe();
      setSuccess(t('saved'));
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.avatar} aria-hidden>
          {initial}
        </div>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>{t('eyebrow')}</p>
          <h1 className={styles.title}>
            {user.displayName?.trim() || t('title')}
          </h1>
          <p className={styles.lead}>{t('hint')}</p>
          <p className={styles.mobileLine}>
            {t('mobile')}: <span>{user.mobile}</span>
          </p>
        </div>
      </header>

      <section className={styles.section} data-open={open.identity ? 'true' : 'false'}>
        <button
          type="button"
          className={styles.sectionToggle}
          aria-expanded={open.identity}
          onClick={() => toggle('identity')}
        >
          <span>
            <span className={styles.sectionTitle}>{t('identityTitle')}</span>
            <span className={styles.sectionHint}>{t('identityHint')}</span>
          </span>
          <span className={styles.chevron} aria-hidden>
            ▾
          </span>
        </button>
        {open.identity ? (
          <form className={styles.form} onSubmit={(e) => void onSubmit(e)}>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span>{t('displayName')}</span>
                <input
                  className={styles.input}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={120}
                  autoComplete="name"
                  placeholder={t('displayNamePh')}
                />
              </label>
              <label className={styles.field}>
                <span>{t('email')}</span>
                <input
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={160}
                  autoComplete="email"
                  placeholder={t('emailPh')}
                />
              </label>
            </div>
            <label className={styles.field}>
              <span>{t('jobTitle')}</span>
              <input
                className={styles.input}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                maxLength={120}
                autoComplete="organization-title"
                placeholder={t('jobTitlePh')}
              />
            </label>
            <label className={styles.field}>
              <span>{t('bio')}</span>
              <textarea
                className={styles.textarea}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder={t('bioPh')}
              />
            </label>
            {error ? <p className={styles.error}>{error}</p> : null}
            {success ? <p className={styles.success}>{success}</p> : null}
            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? t('saving') : t('save')}
            </button>
          </form>
        ) : null}
      </section>

      <section className={styles.section} data-open={open.security ? 'true' : 'false'}>
        <button
          type="button"
          className={styles.sectionToggle}
          aria-expanded={open.security}
          onClick={() => toggle('security')}
        >
          <span>
            <span className={styles.sectionTitle}>{t('securityTitle')}</span>
            <span className={styles.sectionHint}>{t('securityHint')}</span>
          </span>
          <span className={styles.chevron} aria-hidden>
            ▾
          </span>
        </button>
        {open.security ? (
          <div className={styles.securityWrap}>
            <SecuritySettingsPanel hideHeading />
          </div>
        ) : null}
      </section>

      <section className={styles.section} data-open={open.shortcuts ? 'true' : 'false'}>
        <button
          type="button"
          className={styles.sectionToggle}
          aria-expanded={open.shortcuts}
          onClick={() => toggle('shortcuts')}
        >
          <span>
            <span className={styles.sectionTitle}>{t('shortcutsTitle')}</span>
            <span className={styles.sectionHint}>{t('shortcutsHint')}</span>
          </span>
          <span className={styles.chevron} aria-hidden>
            ▾
          </span>
        </button>
        {open.shortcuts ? (
          <div className={styles.shortcuts}>
            <Link className={styles.shortcut} href={`/${locale}/app`}>
              {t('goHome')}
            </Link>
            <Link className={styles.shortcut} href={`/${locale}/app/businesses`}>
              {t('goBusinesses')}
            </Link>
            <Link className={styles.shortcut} href={`/${locale}/app/branding`}>
              {t('goBranding')}
            </Link>
            <button
              type="button"
              className={styles.shortcutDanger}
              onClick={() => void logout()}
            >
              {t('logout')}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
