'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type CSSProperties } from 'react';
import { ThemeToggle } from '@/shared/ui/theme/theme-toggle';
import { LocaleSwitcher } from '@/shared/ui/locale-switcher';
import { BusinessSwitcher } from '@/features/businesses/business-switcher';
import { useAuth } from '@/shared/lib/auth-context';
import { useBusinessBranding } from '@/shared/lib/branding-context';
import { useMembershipPermissions } from '@/shared/lib/use-membership-permissions';
import { clearActiveBusinessId } from '@/shared/lib/business-storage';
import { fetchSystemConfig } from '@/shared/api/system';
import { fetchPlatformAdminMe } from '@/shared/api/platform-admin';
import styles from './app-shell.module.css';

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('app');
  const locale = useLocale();
  const pathname = usePathname();
  const isPublicProfile =
    /\/p\/[^/]+\/[^/]+/.test(pathname ?? '') ||
    /\/s\/[^/]+/.test(pathname ?? '');
  const { isAuthenticated, user, logout, loading } = useAuth();
  const { branding, logoSrc } = useBusinessBranding();
  const { canReadAudit, canManageBackup, canManageSettings } =
    useMembershipPermissions();
  const router = useRouter();
  const [showLicense, setShowLicense] = useState(false);
  const [editionShowPoweredBy, setEditionShowPoweredBy] = useState(true);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showPlatformAdmin, setShowPlatformAdmin] = useState(false);

  const showAudit = canReadAudit;
  const showAnalytics = canReadAudit;
  const brandName = branding?.displayName?.trim() || t('name');
  const accent = branding?.primaryColor ?? undefined;
  const showPoweredBy = branding
    ? branding.showPoweredByEffective
    : editionShowPoweredBy;

  useEffect(() => {
    if (isPublicProfile) return;
    let cancelled = false;
    void (async () => {
      try {
        const config = await fetchSystemConfig();
        if (!cancelled) {
          setShowLicense(config.licenseActivation);
          setEditionShowPoweredBy(config.showPoweredBy);
          setShowMarketplace(Boolean(config.templateMarketplace));
        }
        if (!cancelled && config.platformAdminConsole) {
          try {
            const me = await fetchPlatformAdminMe();
            if (!cancelled) setShowPlatformAdmin(me.isPlatformAdmin);
          } catch {
            if (!cancelled) setShowPlatformAdmin(false);
          }
        } else if (!cancelled) {
          setShowPlatformAdmin(false);
        }
      } catch {
        if (!cancelled) {
          setShowLicense(false);
          setShowMarketplace(false);
          setShowPlatformAdmin(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPublicProfile]);

  async function onLogout() {
    await logout();
    clearActiveBusinessId();
    router.push(`/${locale}`);
  }

  if (isPublicProfile) {
    return <>{children}</>;
  }

  const shellStyle = accent
    ? ({ ['--accent']: accent } as CSSProperties)
    : undefined;

  return (
    <div className={styles.shell} style={shellStyle}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Link href={`/${locale}`} className={styles.brandLink}>
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt="" className={styles.logo} />
            ) : null}
            <p className={styles.name}>{brandName}</p>
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
              {canManageSettings ? (
                <Link
                  className={styles.loginLink}
                  href={`/${locale}/app/branding`}
                >
                  {t('brandingLink')}
                </Link>
              ) : null}
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
              {showMarketplace ? (
                <Link
                  className={styles.loginLink}
                  href={`/${locale}/app/marketplace`}
                >
                  {t('marketplaceLink')}
                </Link>
              ) : null}
              <Link
                className={styles.loginLink}
                href={`/${locale}/app/plugins`}
              >
                {t('pluginsLink')}
              </Link>
              {showPlatformAdmin ? (
                <Link
                  className={styles.loginLink}
                  href={`/${locale}/app/platform-admin`}
                >
                  {t('platformAdminLink')}
                </Link>
              ) : null}
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
              {showAudit ? (
                <Link
                  className={styles.loginLink}
                  href={`/${locale}/app/audit`}
                >
                  {t('auditLink')}
                </Link>
              ) : null}
              {showAnalytics ? (
                <Link
                  className={styles.loginLink}
                  href={`/${locale}/app/analytics`}
                >
                  {t('analyticsLink')}
                </Link>
              ) : null}
              {canManageBackup ? (
                <Link
                  className={styles.loginLink}
                  href={`/${locale}/app/backup`}
                >
                  {t('backupLink')}
                </Link>
              ) : null}
              <Link
                className={styles.loginLink}
                href={`/${locale}/app/members`}
              >
                {t('membersLink')}
              </Link>
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
      {showPoweredBy ? (
        <footer className={styles.footer}>
          <p className={styles.poweredBy}>{t('poweredBy')}</p>
        </footer>
      ) : null}
    </div>
  );
}
