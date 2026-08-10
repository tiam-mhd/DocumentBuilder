'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { ThemeToggle } from '@/shared/ui/theme/theme-toggle';
import { LocaleSwitcher } from '@/shared/ui/locale-switcher';
import { ThemeIconControl } from '@/shared/ui/theme/theme-icon-control';
import { LocaleIconControl } from '@/shared/ui/locale-icon-control';
import { BusinessSwitcher } from '@/features/businesses/business-switcher';
import { useAuth } from '@/shared/lib/auth-context';
import { useBusinessBranding } from '@/shared/lib/branding-context';
import { useMembershipPermissions } from '@/shared/lib/use-membership-permissions';
import { clearActiveBusinessId } from '@/shared/lib/business-storage';
import { fetchSystemConfig } from '@/shared/api/system';
import { fetchPlatformAdminMe } from '@/shared/api/platform-admin';
import {
  isNavActive,
  PANEL_NAV_GROUPS,
  resolvePageTitleKey,
  type PanelNavItem,
} from '@/shared/ui/panel-nav';
import styles from './app-shell.module.css';

const SIDEBAR_COLLAPSED_KEY = 'vdb-sidebar-collapsed';
const NAV_GROUPS_KEY = 'vdb-nav-groups-open';

type Visibility = {
  marketplace: boolean;
  platformAdmin: boolean;
  license: boolean;
  audit: boolean;
  analytics: boolean;
  backup: boolean;
  branding: boolean;
};

function itemVisible(item: PanelNavItem, vis: Visibility): boolean {
  if (!item.when) return true;
  return vis[item.when];
}

function readOpenGroups(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(NAV_GROUPS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations('app');
  const locale = useLocale();
  const pathname = usePathname() ?? '';
  const isPublicProfile =
    /\/p\/[^/]+\/[^/]+/.test(pathname) || /\/s\/[^/]+/.test(pathname);
  const isAppRoute = /\/app(\/|$)/.test(pathname);
  const isAuthRoute = /\/(login|verify)(\/|$)/.test(pathname);
  const { isAuthenticated, user, logout, loading } = useAuth();
  const { branding, logoSrc } = useBusinessBranding();
  const { canReadAudit, canManageBackup, canManageSettings } =
    useMembershipPermissions();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [showLicense, setShowLicense] = useState(false);
  const [editionShowPoweredBy, setEditionShowPoweredBy] = useState(true);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showPlatformAdmin, setShowPlatformAdmin] = useState(false);

  const brandName = branding?.displayName?.trim() || t('name');
  const accent = branding?.primaryColor ?? undefined;
  const showPoweredBy = branding
    ? branding.showPoweredByEffective
    : editionShowPoweredBy;

  const visibility: Visibility = useMemo(
    () => ({
      marketplace: showMarketplace,
      platformAdmin: showPlatformAdmin,
      license: showLicense,
      audit: canReadAudit,
      analytics: canReadAudit,
      backup: canManageBackup,
      branding: canManageSettings,
    }),
    [
      showMarketplace,
      showPlatformAdmin,
      showLicense,
      canReadAudit,
      canManageBackup,
      canManageSettings,
    ],
  );

  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
    const stored = readOpenGroups();
    const defaults: Record<string, boolean> = {};
    for (const g of PANEL_NAV_GROUPS) {
      defaults[g.id] = stored[g.id] ?? true;
    }
    setOpenGroups(defaults);
  }, []);

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

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  }

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(NAV_GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function onLogout() {
    await logout();
    clearActiveBusinessId();
    router.push(`/${locale}/login`);
  }

  if (isPublicProfile) {
    return <>{children}</>;
  }

  const shellStyle = accent
    ? ({ ['--accent']: accent } as CSSProperties)
    : undefined;

  if (!loading && isAuthenticated && isAppRoute) {
    const titleKey = resolvePageTitleKey(pathname, locale);
    const pageTitle = titleKey
      ? t(titleKey as Parameters<typeof t>[0])
      : t('panel');

    return (
      <div
        className={styles.panelShell}
        style={shellStyle}
        data-nav={navOpen ? 'open' : 'closed'}
        data-collapsed={sidebarCollapsed ? 'true' : 'false'}
      >
        <aside className={styles.sidebar} aria-label={t('navLabel')}>
          <div className={styles.sidebarTop}>
            <div className={styles.sideBrandRow}>
              <Link href={`/${locale}/app`} className={styles.sideBrand}>
                {logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoSrc} alt="" className={styles.sideLogo} />
                ) : (
                  <span className={styles.sideMark} aria-hidden>
                    V
                  </span>
                )}
                <span className={styles.sideBrandText}>
                  <span className={styles.sideBrandName}>{brandName}</span>
                  <span className={styles.sideBrandHint}>{t('panel')}</span>
                </span>
              </Link>
              <button
                type="button"
                className={styles.collapseBtn}
                onClick={toggleSidebarCollapsed}
                aria-label={
                  sidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')
                }
                title={
                  sidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')
                }
              >
                {sidebarCollapsed ? '»' : '«'}
              </button>
            </div>
            <div className={styles.switcherSlot}>
              <BusinessSwitcher variant="sidebar" />
            </div>
          </div>

          <nav className={styles.nav}>
            {PANEL_NAV_GROUPS.map((group) => {
              const items = group.items.filter((item) =>
                itemVisible(item, visibility),
              );
              if (items.length === 0) return null;
              const expanded = openGroups[group.id] !== false;
              return (
                <div
                  key={group.id}
                  className={styles.navGroup}
                  data-open={expanded ? 'true' : 'false'}
                >
                  <button
                    type="button"
                    className={styles.navGroupToggle}
                    aria-expanded={expanded}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <span>{t(group.labelKey as Parameters<typeof t>[0])}</span>
                    <span className={styles.groupChevron} aria-hidden>
                      ▾
                    </span>
                  </button>
                  {expanded ? (
                    <ul className={styles.navList}>
                      {items.map((item) => {
                        const active = isNavActive(
                          pathname,
                          item.href,
                          locale,
                        );
                        return (
                          <li key={item.href}>
                            <Link
                              href={`/${locale}${item.href}`}
                              className={styles.navLink}
                              data-active={active ? 'true' : 'false'}
                              aria-current={active ? 'page' : undefined}
                              title={t(item.labelKey as Parameters<typeof t>[0])}
                            >
                              <span className={styles.navDot} aria-hidden />
                              <span className={styles.navLinkText}>
                                {t(item.labelKey as Parameters<typeof t>[0])}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className={styles.sidebarFoot}>
            <p className={styles.userLine}>
              {user?.displayName?.trim() || user?.mobile}
            </p>
            <button
              type="button"
              className={styles.logoutButton}
              onClick={() => void onLogout()}
            >
              {t('logout')}
            </button>
          </div>
        </aside>

        {navOpen ? (
          <button
            type="button"
            className={styles.backdrop}
            aria-label={t('closeNav')}
            onClick={() => setNavOpen(false)}
          />
        ) : null}

        <div className={styles.panelStage}>
          <header className={styles.panelHeader}>
            <div className={styles.headerStart}>
              <button
                type="button"
                className={styles.menuButton}
                aria-label={t('openNav')}
                onClick={() => setNavOpen(true)}
              >
                <span />
                <span />
                <span />
              </button>
              <button
                type="button"
                className={styles.desktopCollapse}
                onClick={toggleSidebarCollapsed}
                aria-label={
                  sidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')
                }
              >
                {sidebarCollapsed ? '»' : '«'}
              </button>
              <div className={styles.headerTitles}>
                <p className={styles.headerEyebrow}>{t('workspace')}</p>
                <h1 className={styles.headerTitle}>{pageTitle}</h1>
              </div>
            </div>
            <div className={styles.headerEnd}>
              <Link
                href={`/${locale}/app/profile`}
                className={styles.headerIcon}
                aria-label={t('profileLink')}
                title={t('profileLink')}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z"
                  />
                </svg>
              </Link>
              <Link
                href={`/${locale}/app/branding`}
                className={styles.headerIcon}
                aria-label={t('businessProfileLink')}
                title={t('businessProfileLink')}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M3 21V7l9-4 9 4v14h-7v-6H10v6H3Zm2-2h3v-4h8v4h3V8.3L12 5.1 5 8.3V19Z"
                  />
                </svg>
              </Link>
              <ThemeIconControl />
              <LocaleIconControl />
            </div>
          </header>

          <main className={styles.panelMain}>
            <div key={pathname} className={styles.pageMotion}>
              {children}
            </div>
          </main>

          {showPoweredBy ? (
            <footer className={styles.panelFooter}>
              <p className={styles.poweredBy}>{t('poweredBy')}</p>
            </footer>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell} style={shellStyle}>
      <header className={styles.publicHeader}>
        <Link href={`/${locale}`} className={styles.publicBrand}>
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="" className={styles.sideLogo} />
          ) : null}
          <span>
            <span className={styles.publicName}>{brandName}</span>
            {!isAuthRoute ? (
              <span className={styles.publicTag}>{t('tagline')}</span>
            ) : null}
          </span>
        </Link>
        <div className={styles.publicControls}>
          {!loading && isAuthenticated ? (
            <>
              <Link className={styles.loginLink} href={`/${locale}/app`}>
                {t('appLink')}
              </Link>
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
