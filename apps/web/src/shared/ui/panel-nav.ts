export type PanelNavItem = {
  href: string;
  labelKey: string;
  /** Show only when flag true */
  when?: 'marketplace' | 'platformAdmin' | 'license' | 'audit' | 'analytics' | 'backup' | 'branding';
};

export type PanelNavGroup = {
  id: string;
  labelKey: string;
  items: PanelNavItem[];
};

/** Relative to `/{locale}` — paths under `/app`. */
export const PANEL_NAV_GROUPS: PanelNavGroup[] = [
  {
    id: 'home',
    labelKey: 'navGroupHome',
    items: [
      { href: '/app', labelKey: 'appLink' },
      { href: '/app/profile', labelKey: 'profileLink' },
    ],
  },
  {
    id: 'documents',
    labelKey: 'navGroupDocuments',
    items: [
      { href: '/app/documents', labelKey: 'documentsLink' },
      { href: '/app/templates', labelKey: 'templatesLink' },
      {
        href: '/app/marketplace',
        labelKey: 'marketplaceLink',
        when: 'marketplace',
      },
    ],
  },
  {
    id: 'content',
    labelKey: 'navGroupContent',
    items: [
      { href: '/app/projects', labelKey: 'projectsLink' },
      { href: '/app/team', labelKey: 'teamLink' },
      { href: '/app/profile-content', labelKey: 'profileContentLink' },
      { href: '/app/galleries', labelKey: 'galleryLink' },
      { href: '/app/locations', labelKey: 'locationsLink' },
      { href: '/app/map', labelKey: 'mapLink' },
      { href: '/app/org-chart', labelKey: 'orgChartLink' },
      { href: '/app/timeline', labelKey: 'timelineLink' },
    ],
  },
  {
    id: 'design',
    labelKey: 'navGroupDesign',
    items: [
      { href: '/app/media', labelKey: 'mediaLink' },
      { href: '/app/fonts', labelKey: 'fontsLink' },
      { href: '/app/themes', labelKey: 'themesLink' },
      { href: '/app/branding', labelKey: 'brandingLink', when: 'branding' },
    ],
  },
  {
    id: 'business',
    labelKey: 'navGroupBusiness',
    items: [
      { href: '/app/businesses', labelKey: 'businessesLink' },
      { href: '/app/billing', labelKey: 'billingLink' },
      { href: '/app/members', labelKey: 'membersLink' },
      { href: '/app/license', labelKey: 'licenseLink', when: 'license' },
    ],
  },
  {
    id: 'system',
    labelKey: 'navGroupSystem',
    items: [
      { href: '/app/plugins', labelKey: 'pluginsLink' },
      { href: '/app/audit', labelKey: 'auditLink', when: 'audit' },
      { href: '/app/analytics', labelKey: 'analyticsLink', when: 'analytics' },
      { href: '/app/backup', labelKey: 'backupLink', when: 'backup' },
      {
        href: '/app/platform-admin',
        labelKey: 'platformAdminLink',
        when: 'platformAdmin',
      },
    ],
  },
];

export function isNavActive(pathname: string, href: string, locale: string): boolean {
  const full = `/${locale}${href}`;
  if (href === '/app') {
    return pathname === full || pathname === `${full}/`;
  }
  return pathname === full || pathname.startsWith(`${full}/`);
}

export function resolvePageTitleKey(
  pathname: string,
  locale: string,
): string | null {
  const prefix = `/${locale}`;
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length) || '/';
  for (const group of PANEL_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.href === '/app') {
        if (rest === '/app' || rest === '/app/') return item.labelKey;
        continue;
      }
      if (rest === item.href || rest.startsWith(`${item.href}/`)) {
        return item.labelKey;
      }
    }
  }
  return null;
}
