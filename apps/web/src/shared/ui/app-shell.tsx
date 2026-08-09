'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/shared/ui/theme/theme-toggle';
import { LocaleSwitcher } from '@/shared/ui/locale-switcher';
import { BusinessSwitcher } from '@/features/businesses/business-switcher';
import { useAuth } from '@/shared/lib/auth-context';
import { clearActiveBusinessId } from '@/shared/lib/business-storage';
import { fetchSystemConfig } from '@/shared/api/system';
import styles from './app-shell.module.css';

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('app');
  const locale = useLocale();
  const { isAuthenticated, user, logout, loading } = useAuth();
  const router = useRouter();
  const [showLicense, setShowLicense] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const config = await fetchSystemConfig();
        if (!cancelled) setShowLicense(config.licenseActivation);
      } catch {
        if (!cancelled) setShowLicense(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onLogout() {
    await logout();
    clearActiveBusinessId();
    router.push(`/${locale}`);
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Link href={`/${locale}`} className={styles.brandLink}>
            <p className={styles.name}>{t('name')}</p>
            <p className={styles.tagline}>{t('tagline')}</p>
          </Link>
        </div>
        <div className={styles.controls}>
          {!loading && isAuthenticated ? (
            <>
              <BusinessSwitcher />
              <Link className={styles.loginLink} href={`/${locale}/app`}>
                {t('appLink')}
              </Link>
              <Link
                className={styles.loginLink}
                href={`/${locale}/app/businesses`}
              >
                {t('businessesLink')}
              </Link>
              <Link className={styles.loginLink} href={`/${locale}/app/billing`}>
                {t('billingLink')}
              </Link>
              <Link className={styles.loginLink} href={`/${locale}/app/media`}>
                {t('mediaLink')}
              </Link>
              <Link className={styles.loginLink} href={`/${locale}/app/fonts`}>
                {t('fontsLink')}
              </Link>
              <Link className={styles.loginLink} href={`/${locale}/app/themes`}>
                {t('themesLink')}
              </Link>
              <Link
                className={styles.loginLink}
                href={`/${locale}/app/templates`}
              >
                {t('templatesLink')}
              </Link>
              <Link
                className={styles.loginLink}
                href={`/${locale}/app/documents`}
              >
                {t('documentsLink')}
              </Link>
              <Link
                className={styles.loginLink}
                href={`/${locale}/app/projects`}
              >
                {t('projectsLink')}
              </Link>
              <Link className={styles.loginLink} href={`/${locale}/app/team`}>
                {t('teamLink')}
              </Link>
              <Link
                className={styles.loginLink}
                href={`/${locale}/app/profile-content`}
              >
                {t('profileContentLink')}
              </Link>
              <Link
                className={styles.loginLink}
                href={`/${locale}/app/galleries`}
              >
                {t('galleryLink')}
              </Link>
              <Link
                className={styles.loginLink}
                href={`/${locale}/app/locations`}
              >
                {t('locationsLink')}
              </Link>
              <Link className={styles.loginLink} href={`/${locale}/app/map`}>
                {t('mapLink')}
              </Link>
              <Link
                className={styles.loginLink}
                href={`/${locale}/app/org-chart`}
              >
                {t('orgChartLink')}
              </Link>
              <Link
                className={styles.loginLink}
                href={`/${locale}/app/timeline`}
              >
                {t('timelineLink')}
              </Link>
              {showLicense ? (
                <Link
                  className={styles.loginLink}
                  href={`/${locale}/app/license`}
                >
                  {t('licenseLink')}
                </Link>
              ) : null}
              <span className={styles.userChip}>{user?.mobile}</span>
              <button
                type="button"
                className={styles.logoutButton}
                onClick={() => void onLogout()}
              >
                {t('logout')}
              </button>
            </>
          ) : (
            <Link className={styles.loginLink} href={`/${locale}/login`}>
              {t('loginLink')}
            </Link>
          )}
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
