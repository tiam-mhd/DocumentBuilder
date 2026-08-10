export enum SubscriptionStatus {
  Trial = 'trial',
  Active = 'active',
  Grace = 'grace',
  Expired = 'expired',
  PendingPayment = 'pending_payment',
}

export const TRIAL_DURATION_DAYS = 7 as const;

/** Days after endsAt where subscription stays writable as `grace` (ADR 032). */
export const GRACE_DURATION_DAYS = 3 as const;

/** Reminder offsets (days before endsAt) for dunning SMS. */
export const DUNNING_REMINDER_DAYS = [7, 1] as const;

export const DunningNoticeKind = {
  Reminder7d: 'reminder_7d',
  Reminder1d: 'reminder_1d',
  EnteredGrace: 'entered_grace',
  EnteredExpired: 'entered_expired',
} as const;

export type DunningNoticeKindValue =
  (typeof DunningNoticeKind)[keyof typeof DunningNoticeKind];

/**
 * Resolve lifecycle status from stored status + endsAt + grace window.
 * Past endsAt → grace for GRACE_DURATION_DAYS, then expired.
 */
export function resolveSubscriptionEffectiveStatus(
  status: SubscriptionStatus | string,
  endsAt: Date | string | null,
  now: Date = new Date(),
  graceDays: number = GRACE_DURATION_DAYS,
): SubscriptionStatus {
  const mapped = status as SubscriptionStatus;
  if (
    mapped !== SubscriptionStatus.Trial &&
    mapped !== SubscriptionStatus.Active &&
    mapped !== SubscriptionStatus.Grace
  ) {
    return mapped;
  }
  if (!endsAt) return mapped;
  const endMs =
    typeof endsAt === 'string' ? Date.parse(endsAt) : endsAt.getTime();
  if (Number.isNaN(endMs)) return mapped;
  const nowMs = now.getTime();
  if (nowMs < endMs) return mapped;
  const graceEndMs = endMs + Math.max(0, graceDays) * 86_400_000;
  if (nowMs < graceEndMs) return SubscriptionStatus.Grace;
  return SubscriptionStatus.Expired;
}

export function subscriptionGraceEndsAt(
  endsAt: Date | string | null,
  graceDays: number = GRACE_DURATION_DAYS,
): Date | null {
  if (!endsAt) return null;
  const endMs =
    typeof endsAt === 'string' ? Date.parse(endsAt) : endsAt.getTime();
  if (Number.isNaN(endMs)) return null;
  return new Date(endMs + Math.max(0, graceDays) * 86_400_000);
}

/** Whole calendar days from `now` until `endsAt` (negative if past). */
export function daysUntilSubscriptionEnd(
  endsAt: Date | string | null,
  now: Date = new Date(),
): number | null {
  if (!endsAt) return null;
  const endMs =
    typeof endsAt === 'string' ? Date.parse(endsAt) : endsAt.getTime();
  if (Number.isNaN(endMs)) return null;
  return Math.ceil((endMs - now.getTime()) / 86_400_000);
}

/** Statuses that allow mutating / export work (EntitlementGuard). */
export const WRITABLE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.Trial,
  SubscriptionStatus.Active,
  SubscriptionStatus.Grace,
];

export function isSubscriptionWritable(
  status: SubscriptionStatus | string,
): boolean {
  return WRITABLE_SUBSCRIPTION_STATUSES.includes(
    status as SubscriptionStatus,
  );
}

/**
 * Document / Business content locale (ADR 015).
 * Separate from Next.js UI chrome locale (next-intl).
 * Canonical PG columns hold `fa`; other locales live under `translations`.
 */
export const CONTENT_LOCALES = ['fa', 'en'] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];
export const DEFAULT_CONTENT_LOCALE: ContentLocale = 'fa';

/** Non-default locale bags keyed by locale code (MVP: `en` only). */
export type EntityTranslations = Partial<
  Record<Exclude<ContentLocale, 'fa'>, Record<string, string>>
>;

export function isContentLocale(value: unknown): value is ContentLocale {
  return value === 'fa' || value === 'en';
}

export function parseContentLocale(raw: unknown): ContentLocale {
  return isContentLocale(raw) ? raw : DEFAULT_CONTENT_LOCALE;
}

export function contentLocaleDir(locale: ContentLocale): 'rtl' | 'ltr' {
  return locale === 'en' ? 'ltr' : 'rtl';
}

export function asEntityTranslations(raw: unknown): EntityTranslations {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: EntityTranslations = {};
  const en = (raw as Record<string, unknown>).en;
  if (en && typeof en === 'object' && !Array.isArray(en)) {
    const bag: Record<string, string> = {};
    for (const [k, v] of Object.entries(en)) {
      if (typeof v === 'string' && v.trim().length > 0) {
        bag[k] = v.trim();
      }
    }
    if (Object.keys(bag).length > 0) out.en = bag;
  }
  return out;
}

/**
 * Resolve localized string fields. `fa` uses canonical columns;
 * other locales use `translations.<locale>` with fallback to columns.
 */
export function pickLocalized<T extends Record<string, string>>(
  base: T,
  translations: unknown,
  locale: ContentLocale,
  fields: readonly (keyof T & string)[],
): T {
  if (locale === DEFAULT_CONTENT_LOCALE) {
    return { ...base };
  }
  const bag = asEntityTranslations(translations).en ?? {};
  const out = { ...base };
  for (const field of fields) {
    const translated = bag[field];
    if (typeof translated === 'string' && translated.trim().length > 0) {
      out[field] = translated as T[keyof T & string];
    }
  }
  return out;
}

/** Normalize write payload; only `en` + allowlisted fields kept. */
export function normalizeEntityTranslations(
  raw: unknown,
  allowedFields: readonly string[],
): EntityTranslations {
  const parsed = asEntityTranslations(raw);
  if (!parsed.en) return {};
  const allow = new Set(allowedFields);
  const bag: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed.en)) {
    if (!allow.has(k)) continue;
    const trimmed = v.trim().slice(0, 4000);
    if (trimmed) bag[k] = trimmed;
  }
  return Object.keys(bag).length > 0 ? { en: bag } : {};
}

export type PublicSubscription = {
  id: string;
  businessId: string;
  planId: string | null;
  planCode: string | null;
  status: SubscriptionStatus;
  /** Status after applying endsAt + grace window (may differ from stored status). */
  effectiveStatus: SubscriptionStatus;
  writable: boolean;
  startsAt: string;
  endsAt: string | null;
  /** endsAt + GRACE_DURATION_DAYS when endsAt is set. */
  graceEndsAt: string | null;
  /** Whole days until endsAt (negative if past). */
  daysUntilEnd: number | null;
};

export enum AppEdition {
  SelfHosted = 'SELF_HOSTED',
  Saas = 'SAAS',
}

/** Capability codes enforced by EntitlementGuard and mirrored in the web UI. */
export const EntitlementCodes = {
  ExportPdf: 'export.pdf',
  ModuleMap: 'module.map',
  ModuleOrgChart: 'module.org_chart',
  ModuleTimeline: 'module.timeline',
  ModuleProjects: 'module.projects',
  ModuleGallery: 'module.gallery',
  /** SAAS paid white-label; SELF_HOSTED always allowed via edition. */
  BrandingWhiteLabel: 'branding.white_label',
  /** SAAS template marketplace browse/install access (ADR 029). */
  MarketplaceTemplates: 'marketplace.templates',
} as const;

export type EntitlementCode =
  (typeof EntitlementCodes)[keyof typeof EntitlementCodes];

export const ENTITLEMENT_CODE_LIST: EntitlementCode[] = Object.values(
  EntitlementCodes,
);

export const EntitlementErrorCodes = {
  Denied: 'ENTITLEMENT_DENIED',
  ModuleRequired: 'ENTITLEMENT_MODULE_REQUIRED',
  SubscriptionNotWritable: 'SUBSCRIPTION_NOT_WRITABLE',
  SubscriptionNotFound: 'SUBSCRIPTION_NOT_FOUND',
} as const;

export type EntitlementErrorCode =
  (typeof EntitlementErrorCodes)[keyof typeof EntitlementErrorCodes];

/** Resolved capabilities for a Business (plan base + attached modules). */
export type PublicBusinessEntitlements = {
  businessId: string;
  writable: boolean;
  effectiveStatus: SubscriptionStatus;
  planCode: string | null;
  codes: string[];
  modules: string[];
};

/** Catalog plan codes (stable, seed + API). */
export const PlanCodes = {
  Core: 'plan.core',
} as const;

export type PlanCode = (typeof PlanCodes)[keyof typeof PlanCodes];

export const MODULE_ENTITLEMENT_CODES = [
  EntitlementCodes.ModuleMap,
  EntitlementCodes.ModuleOrgChart,
  EntitlementCodes.ModuleTimeline,
  EntitlementCodes.ModuleProjects,
  EntitlementCodes.ModuleGallery,
  EntitlementCodes.BrandingWhiteLabel,
  EntitlementCodes.MarketplaceTemplates,
] as const;

export type PublicPlan = {
  id: string;
  code: string;
  nameKey: string;
  descriptionKey: string;
  priceMonthly: number;
  currency: string;
  baseEntitlements: string[];
  moduleCodes: string[];
};

export type PublicCatalogModule = {
  id: string;
  code: string;
  nameKey: string;
  descriptionKey: string;
  priceMonthly: number;
  currency: string;
};

export type BillingCatalog = {
  plans: PublicPlan[];
  modules: PublicCatalogModule[];
};

export enum PaymentProvider {
  Fake = 'fake',
  Zarinpal = 'zarinpal',
}

export enum PaymentStatus {
  Pending = 'pending',
  Paid = 'paid',
  Failed = 'failed',
  Canceled = 'canceled',
}

export const SUBSCRIPTION_PERIOD_DAYS = 30 as const;

export const BillingErrorCodes = {
  CheckoutUnavailable: 'BILLING_CHECKOUT_UNAVAILABLE',
  PlanNotFound: 'BILLING_PLAN_NOT_FOUND',
  ModuleNotFound: 'BILLING_MODULE_NOT_FOUND',
  PaymentNotFound: 'BILLING_PAYMENT_NOT_FOUND',
  PaymentFailed: 'BILLING_PAYMENT_FAILED',
  PaymentProviderError: 'BILLING_PROVIDER_ERROR',
  IdempotencyConflict: 'BILLING_IDEMPOTENCY_CONFLICT',
} as const;

export type BillingErrorCode =
  (typeof BillingErrorCodes)[keyof typeof BillingErrorCodes];

export type CheckoutRequest = {
  planCode: string;
  moduleCodes?: string[];
};

export type CheckoutSession = {
  paymentId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider | string;
  redirectUrl: string;
  gatewayRef: string | null;
};

export type PublicPayment = {
  id: string;
  businessId: string;
  invoiceId: string;
  status: PaymentStatus | string;
  amount: number;
  currency: string;
  provider: PaymentProvider | string;
  paidAt: string | null;
};

export const LicenseErrorCodes = {
  NotApplicable: 'LICENSE_NOT_APPLICABLE',
  Required: 'LICENSE_REQUIRED',
  Invalid: 'LICENSE_INVALID',
  Expired: 'LICENSE_EXPIRED',
  AlreadyActive: 'LICENSE_ALREADY_ACTIVE',
} as const;

export type LicenseErrorCode =
  (typeof LicenseErrorCodes)[keyof typeof LicenseErrorCodes];

/** Public install license status (no raw key / hash). */
export type PublicInstallationLicense = {
  required: boolean;
  active: boolean;
  organizationName: string | null;
  keyHint: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
};

export type ActivateLicenseBody = {
  licenseKey: string;
  organizationName?: string;
};

export type ApiErrorBody = {
  code: string;
  message: string;
};

export type ApiEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
  errors?: ApiErrorBody[];
};

/** Machine codes for Identity / OTP (client maps → i18n). */
export const AuthErrorCodes = {
  MobileInvalid: 'MOBILE_INVALID',
  OtpCooldown: 'OTP_COOLDOWN',
  OtpRateLimited: 'OTP_RATE_LIMITED',
  OtpInvalid: 'OTP_INVALID',
  OtpExpired: 'OTP_EXPIRED',
  RedisUnavailable: 'REDIS_UNAVAILABLE',
  AuthRequired: 'AUTH_REQUIRED',
  AuthInvalid: 'AUTH_INVALID',
} as const;

export type AuthErrorCode =
  (typeof AuthErrorCodes)[keyof typeof AuthErrorCodes];

export type PublicUser = {
  id: string;
  mobile: string;
  trialConsumed: boolean;
  createdAt: string;
};

export type AuthTokens = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
};

export enum MembershipRole {
  Owner = 'OWNER',
  Admin = 'ADMIN',
  Editor = 'EDITOR',
  Viewer = 'VIEWER',
}

/** Higher = more privileged. */
export const MEMBERSHIP_ROLE_RANK: Record<MembershipRole, number> = {
  [MembershipRole.Viewer]: 1,
  [MembershipRole.Editor]: 2,
  [MembershipRole.Admin]: 3,
  [MembershipRole.Owner]: 4,
};

export function membershipRoleAtLeast(
  role: MembershipRole | string,
  minimum: MembershipRole,
): boolean {
  const rank = MEMBERSHIP_ROLE_RANK[role as MembershipRole];
  if (rank === undefined) return false;
  return rank >= MEMBERSHIP_ROLE_RANK[minimum];
}

export function membershipCanWriteContent(
  role: MembershipRole | string,
): boolean {
  return roleHasPermission(role, MembershipPermissionCodes.ManageDocuments);
}

export function membershipCanManageSettings(
  role: MembershipRole | string,
): boolean {
  return roleHasPermission(role, MembershipPermissionCodes.ManageSettings);
}

export function membershipCanManageBilling(
  role: MembershipRole | string,
): boolean {
  return roleHasPermission(role, MembershipPermissionCodes.ManageBilling);
}

export function membershipCanManageMembers(
  role: MembershipRole | string,
): boolean {
  return roleHasPermission(role, MembershipPermissionCodes.ManageMembers);
}

/** Fine-grained membership RBAC (P04-T02) — not subscription entitlements. */
export const MembershipPermissionCodes = {
  ManageData: 'manage.data',
  ManageTemplates: 'manage.templates',
  ManageAssets: 'manage.assets',
  ManageThemes: 'manage.themes',
  ManageDocuments: 'manage.documents',
  /** Role gate for PDF enqueue; still requires entitlement `export.pdf`. */
  ExportPdf: 'rbac.export.pdf',
  DocumentsPublish: 'documents.publish',
  ManageSettings: 'manage.settings',
  ManageMembers: 'manage.members',
  ManageBilling: 'manage.billing',
  ManageBackup: 'manage.backup',
  AuditRead: 'audit.read',
} as const;

export type MembershipPermissionCode =
  (typeof MembershipPermissionCodes)[keyof typeof MembershipPermissionCodes];

export const MEMBERSHIP_PERMISSION_LIST: MembershipPermissionCode[] =
  Object.values(MembershipPermissionCodes);

const EDITOR_PERMISSIONS: MembershipPermissionCode[] = [
  MembershipPermissionCodes.ManageData,
  MembershipPermissionCodes.ManageTemplates,
  MembershipPermissionCodes.ManageAssets,
  MembershipPermissionCodes.ManageThemes,
  MembershipPermissionCodes.ManageDocuments,
  MembershipPermissionCodes.ExportPdf,
];

const ADMIN_EXTRA: MembershipPermissionCode[] = [
  MembershipPermissionCodes.DocumentsPublish,
  MembershipPermissionCodes.ManageSettings,
  MembershipPermissionCodes.ManageMembers,
  MembershipPermissionCodes.AuditRead,
];

const OWNER_EXTRA: MembershipPermissionCode[] = [
  MembershipPermissionCodes.ManageBilling,
  MembershipPermissionCodes.ManageBackup,
];

/** Locked role → permission matrix (P04-T02). */
export const ROLE_PERMISSIONS: Record<
  MembershipRole,
  readonly MembershipPermissionCode[]
> = {
  [MembershipRole.Viewer]: [],
  [MembershipRole.Editor]: EDITOR_PERMISSIONS,
  [MembershipRole.Admin]: [...EDITOR_PERMISSIONS, ...ADMIN_EXTRA],
  [MembershipRole.Owner]: [
    ...EDITOR_PERMISSIONS,
    ...ADMIN_EXTRA,
    ...OWNER_EXTRA,
  ],
};

export function permissionsForRole(
  role: MembershipRole | string,
): MembershipPermissionCode[] {
  const list = ROLE_PERMISSIONS[role as MembershipRole];
  return list ? [...list] : [];
}

export function roleHasPermission(
  role: MembershipRole | string,
  permission: MembershipPermissionCode | string,
): boolean {
  return permissionsForRole(role).includes(
    permission as MembershipPermissionCode,
  );
}

export type PublicBusinessPermissions = {
  businessId: string;
  role: MembershipRole;
  permissions: MembershipPermissionCode[];
};

export const MembershipPermissionErrorCodes = {
  Denied: 'MEMBERSHIP_PERMISSION_DENIED',
} as const;

/** Roles that may be assigned via invite (never OWNER). */
export const INVITABLE_MEMBERSHIP_ROLES = [
  MembershipRole.Admin,
  MembershipRole.Editor,
  MembershipRole.Viewer,
] as const;

export type InvitableMembershipRole =
  (typeof INVITABLE_MEMBERSHIP_ROLES)[number];

export const InvitationStatus = {
  Pending: 'pending',
  Accepted: 'accepted',
  Revoked: 'revoked',
  Expired: 'expired',
} as const;

export type InvitationStatusValue =
  (typeof InvitationStatus)[keyof typeof InvitationStatus];

export const TenancyErrorCodes = {
  BusinessNotFound: 'BUSINESS_NOT_FOUND',
  BusinessForbidden: 'BUSINESS_FORBIDDEN',
  BusinessNameInvalid: 'BUSINESS_NAME_INVALID',
  InvitationNotFound: 'INVITATION_NOT_FOUND',
  InvitationExpired: 'INVITATION_EXPIRED',
  InvitationRevoked: 'INVITATION_REVOKED',
  InvitationMobileMismatch: 'INVITATION_MOBILE_MISMATCH',
  InvitationInvalidRole: 'INVITATION_INVALID_ROLE',
  InvitationDuplicate: 'INVITATION_DUPLICATE',
  MemberNotFound: 'MEMBER_NOT_FOUND',
  MemberCannotModifyOwner: 'MEMBER_CANNOT_MODIFY_OWNER',
  MemberCannotRemoveSelf: 'MEMBER_CANNOT_REMOVE_SELF',
  MemberAlreadyExists: 'MEMBER_ALREADY_EXISTS',
  MobileInvalid: 'MOBILE_INVALID',
  MembershipPermissionDenied: 'MEMBERSHIP_PERMISSION_DENIED',
} as const;

export type TenancyErrorCode =
  (typeof TenancyErrorCodes)[keyof typeof TenancyErrorCodes];

export type PublicBusiness = {
  id: string;
  name: string;
  role: MembershipRole;
  createdAt: string;
  updatedAt: string;
  /** SAAS platform suspension (ADR 031). */
  suspended: boolean;
};

export type PublicBusinessMember = {
  userId: string;
  mobile: string;
  role: MembershipRole;
  createdAt: string;
  updatedAt: string;
};

export type PublicBusinessInvitation = {
  id: string;
  businessId: string;
  mobile: string;
  role: InvitableMembershipRole | string;
  status: InvitationStatusValue | string;
  expiresAt: string;
  createdAt: string;
  /** Present only when creating (shareable once). */
  token?: string;
  acceptPath?: string;
};

export type PublicInvitationPreview = {
  token: string;
  businessId: string;
  businessName: string;
  role: InvitableMembershipRole | string;
  mobile: string;
  status: InvitationStatusValue | string;
  expiresAt: string;
};

/** Cookie / localStorage key for active business in the web shell. */
export const ACTIVE_BUSINESS_COOKIE = 'vdb-business-id';
export const ACTIVE_BUSINESS_HEADER = 'X-Business-Id';

export const MediaErrorCodes = {
  NotFound: 'MEDIA_NOT_FOUND',
  InvalidType: 'MEDIA_INVALID_TYPE',
  TooLarge: 'MEDIA_TOO_LARGE',
  SvgForbidden: 'MEDIA_SVG_FORBIDDEN',
  UploadFailed: 'MEDIA_UPLOAD_FAILED',
  StorageError: 'MEDIA_STORAGE_ERROR',
} as const;

export type MediaErrorCode =
  (typeof MediaErrorCodes)[keyof typeof MediaErrorCodes];

export type MediaVariant = 'original' | 'thumb' | 'web' | 'print';

export type PublicMediaAsset = {
  id: string;
  businessId: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  status: 'ready' | 'processing' | 'failed' | string;
  createdAt: string;
  /** Relative API paths for variants (auth required). */
  urls: {
    original: string;
    thumb: string | null;
    web: string | null;
    print: string | null;
  };
};

export type PublicMediaList = {
  items: PublicMediaAsset[];
  page: number;
  pageSize: number;
  total: number;
};

/** Locked font formats — see `.cursor/rules/11-fonts.mdc`. */
export const FONT_ALLOWED_EXTENSIONS = ['woff2', 'ttf', 'otf'] as const;
export type FontAllowedExtension = (typeof FONT_ALLOWED_EXTENSIONS)[number];

export const FontStyle = {
  Normal: 'normal',
  Italic: 'italic',
} as const;

export type FontStyleValue = (typeof FontStyle)[keyof typeof FontStyle];

export const FontErrorCodes = {
  NotFound: 'FONT_NOT_FOUND',
  InvalidType: 'FONT_INVALID_TYPE',
  TooLarge: 'FONT_TOO_LARGE',
  InvalidFamily: 'FONT_INVALID_FAMILY',
  InvalidWeight: 'FONT_INVALID_WEIGHT',
  Duplicate: 'FONT_DUPLICATE',
  UploadFailed: 'FONT_UPLOAD_FAILED',
  StorageError: 'FONT_STORAGE_ERROR',
} as const;

export type FontErrorCode =
  (typeof FontErrorCodes)[keyof typeof FontErrorCodes];

export type PublicFontFace = {
  id: string;
  businessId: string;
  family: string;
  weight: number;
  style: FontStyleValue | string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  /** Object storage key — PDF worker loads via ObjectStorage.get(storageKey). */
  storageKey: string;
  createdAt: string;
  /** Authenticated stream path for tooling / previews. */
  fileUrl: string;
};

export type PublicFontList = {
  items: PublicFontFace[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * Document brand theme tokens (PDF / template) — not app chrome dark/light.
 * See `.cursor/rules/12-design-themes.mdc`.
 */
export type DesignThemeColorTokens = {
  primary: string;
  secondary: string;
  text: string;
  background: string;
};

export type DesignThemeTypographyTokens = {
  headingFamily: string;
  bodyFamily: string;
  headingWeight: number;
  bodyWeight: number;
  baseSizePx: number;
};

export type DesignThemeFontRefs = {
  /** Optional `font_faces.id` in the same Business. */
  headingFontFaceId: string | null;
  bodyFontFaceId: string | null;
};

export type DesignThemeTokens = {
  colors: DesignThemeColorTokens;
  typography: DesignThemeTypographyTokens;
  fonts: DesignThemeFontRefs;
};

export const DEFAULT_DESIGN_THEME_TOKENS: DesignThemeTokens = {
  colors: {
    primary: '#1B4D3E',
    secondary: '#C4A574',
    text: '#1A1A1A',
    background: '#FFFFFF',
  },
  typography: {
    headingFamily: 'Vazirmatn',
    bodyFamily: 'Vazirmatn',
    headingWeight: 700,
    bodyWeight: 400,
    baseSizePx: 16,
  },
  fonts: {
    headingFontFaceId: null,
    bodyFontFaceId: null,
  },
};

export const DEFAULT_DESIGN_THEME_NAME = 'Default';

export const DesignThemeErrorCodes = {
  NotFound: 'THEME_NOT_FOUND',
  InvalidTokens: 'THEME_INVALID_TOKENS',
  InvalidName: 'THEME_INVALID_NAME',
  FontNotFound: 'THEME_FONT_NOT_FOUND',
  CannotDeleteDefault: 'THEME_CANNOT_DELETE_DEFAULT',
} as const;

export type DesignThemeErrorCode =
  (typeof DesignThemeErrorCodes)[keyof typeof DesignThemeErrorCodes];

export type PublicDesignTheme = {
  id: string;
  businessId: string;
  name: string;
  isDefault: boolean;
  tokens: DesignThemeTokens;
  createdAt: string;
  updatedAt: string;
};

export type PublicDesignThemeList = {
  items: PublicDesignTheme[];
  page: number;
  pageSize: number;
  total: number;
};

/** White-label / customer chrome brand (P04-T03) — not design_themes. */
export const BrandingErrorCodes = {
  NotAllowed: 'BRANDING_NOT_ALLOWED',
  InvalidColor: 'BRANDING_INVALID_COLOR',
  InvalidDomain: 'BRANDING_INVALID_DOMAIN',
  DomainTaken: 'BRANDING_DOMAIN_TAKEN',
  LogoInvalidType: 'BRANDING_LOGO_INVALID_TYPE',
  LogoTooLarge: 'BRANDING_LOGO_TOO_LARGE',
  LogoNotFound: 'BRANDING_LOGO_NOT_FOUND',
} as const;

export type BrandingErrorCode =
  (typeof BrandingErrorCodes)[keyof typeof BrandingErrorCodes];

export type PublicBusinessBrandingCapabilities = {
  /** Edition SELF_HOSTED or entitlement branding.white_label. */
  canCustomize: boolean;
  canHidePoweredBy: boolean;
  canSetCustomDomain: boolean;
  requiresEntitlement: boolean;
};

export type PublicBusinessBranding = {
  businessId: string;
  displayName: string | null;
  primaryColor: string | null;
  hasLogo: boolean;
  logoUrl: string | null;
  customDomain: string | null;
  hidePoweredBy: boolean;
  /** Effective footer flag after edition + entitlement + setting. */
  showPoweredByEffective: boolean;
  capabilities: PublicBusinessBrandingCapabilities;
  updatedAt: string;
};

export type PublicBrandingResolve = {
  businessId: string;
  displayName: string | null;
  primaryColor: string | null;
  hasLogo: boolean;
  logoUrl: string | null;
  hidePoweredBy: boolean;
  showPoweredByEffective: boolean;
  customDomain: string | null;
};

export const TemplateErrorCodes = {
  NotFound: 'TEMPLATE_NOT_FOUND',
  InvalidName: 'TEMPLATE_INVALID_NAME',
  InvalidBody: 'TEMPLATE_INVALID_BODY',
  ThemeNotFound: 'TEMPLATE_THEME_NOT_FOUND',
  StorageError: 'TEMPLATE_STORAGE_ERROR',
} as const;

export type TemplateErrorCode =
  (typeof TemplateErrorCodes)[keyof typeof TemplateErrorCodes];

/** PG metadata only — body is Mongo `template_bodies`. */
export type PublicDocumentTemplate = {
  id: string;
  businessId: string;
  themeId: string | null;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicDocumentTemplateDetail = PublicDocumentTemplate & {
  /** Validated TemplateBody from document-schema */
  body: unknown;
};

export type PublicDocumentTemplateList = {
  items: PublicDocumentTemplate[];
  page: number;
  pageSize: number;
  total: number;
};

/** SAAS global catalog listing (ADR 029) — not business-owned. */
export const MarketplaceErrorCodes = {
  EditionRequired: 'MARKETPLACE_EDITION_REQUIRED',
  NotFound: 'MARKETPLACE_NOT_FOUND',
  InvalidBody: 'MARKETPLACE_INVALID_BODY',
  InstallFailed: 'MARKETPLACE_INSTALL_FAILED',
} as const;

export type MarketplaceErrorCode =
  (typeof MarketplaceErrorCodes)[keyof typeof MarketplaceErrorCodes];

export type PublicMarketplaceTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  locale: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicMarketplaceTemplateDetail = PublicMarketplaceTemplate & {
  /** TemplateBody-shaped JSON (platform catalog). */
  body: unknown;
};

export type PublicMarketplaceTemplateList = {
  items: PublicMarketplaceTemplate[];
  page: number;
  pageSize: number;
  total: number;
};

export type PublicMarketplaceInstallResult = {
  template: PublicDocumentTemplateDetail;
  marketplaceTemplateId: string;
};

/** SAAS platform admin console (ADR 031). */
export const PlatformAdminErrorCodes = {
  EditionRequired: 'PLATFORM_ADMIN_EDITION_REQUIRED',
  Forbidden: 'PLATFORM_ADMIN_FORBIDDEN',
  IpDenied: 'PLATFORM_ADMIN_IP_DENIED',
  BusinessNotFound: 'PLATFORM_ADMIN_BUSINESS_NOT_FOUND',
  BusinessSuspended: 'BUSINESS_SUSPENDED',
} as const;

export type PlatformAdminErrorCode =
  (typeof PlatformAdminErrorCodes)[keyof typeof PlatformAdminErrorCodes];

export type PublicPlatformAdminMe = {
  isPlatformAdmin: boolean;
  edition: AppEdition;
};

export type PublicPlatformAdminUser = {
  id: string;
  /** Account login identity — platform ops only. */
  mobile: string;
  trialConsumed: boolean;
  membershipCount: number;
  createdAt: string;
};

export type PublicPlatformAdminUserList = {
  items: PublicPlatformAdminUser[];
  page: number;
  pageSize: number;
  total: number;
};

export type PublicPlatformAdminBusiness = {
  id: string;
  name: string;
  suspended: boolean;
  suspendedReason: string | null;
  suspendedAt: string | null;
  memberCount: number;
  createdAt: string;
};

export type PublicPlatformAdminBusinessList = {
  items: PublicPlatformAdminBusiness[];
  page: number;
  pageSize: number;
  total: number;
};

export type PublicPlatformAdminSubscription = {
  id: string;
  businessId: string;
  businessName: string;
  planCode: string | null;
  status: string;
  effectiveStatus: string;
  startsAt: string;
  endsAt: string | null;
  businessSuspended: boolean;
};

export type PublicPlatformAdminSubscriptionList = {
  items: PublicPlatformAdminSubscription[];
  page: number;
  pageSize: number;
  total: number;
};

export type PublicPlatformAdminFailedJob = {
  id: string;
  kind: 'export';
  businessId: string;
  documentId: string;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
};

export type PublicPlatformAdminFailedJobList = {
  items: PublicPlatformAdminFailedJob[];
  page: number;
  pageSize: number;
  total: number;
};

export type PublicBlockRegistryEntry = {
  type: string;
  labelKey: string;
  allowsChildren: boolean;
  moduleCode: string | null;
  pluginId?: string;
};

export type PublicBlockRegistry = {
  schemaVersion: number;
  items: PublicBlockRegistryEntry[];
};

/** First-party plugin catalog (ADR 030). */
export const PluginErrorCodes = {
  NotFound: 'PLUGIN_NOT_FOUND',
} as const;

export type PluginErrorCode =
  (typeof PluginErrorCodes)[keyof typeof PluginErrorCodes];

export type PublicPluginBlock = {
  type: string;
  labelKey: string;
  allowsChildren: boolean;
  moduleCode: string | null;
};

export type PublicPluginManifest = {
  id: string;
  version: string;
  name: string;
  description: string | null;
  moduleCode: string | null;
  trust: 'first-party';
  blocks: PublicPluginBlock[];
};

export type PublicPluginList = {
  items: PublicPluginManifest[];
};

export const DocumentStatus = {
  Draft: 'draft',
  Review: 'review',
  Approved: 'approved',
  Published: 'published',
} as const;

export type DocumentStatusValue =
  (typeof DocumentStatus)[keyof typeof DocumentStatus];

/** Statuses that lock document body edits (ADR 020/021). */
export const DOCUMENT_BODY_LOCKED_STATUSES: readonly DocumentStatusValue[] = [
  DocumentStatus.Review,
  DocumentStatus.Approved,
  DocumentStatus.Published,
] as const;

/** Statuses allowed for final PDF export (ADR 021). */
export const DOCUMENT_EXPORT_ALLOWED_STATUSES: readonly DocumentStatusValue[] = [
  DocumentStatus.Approved,
  DocumentStatus.Published,
] as const;

export const DocumentErrorCodes = {
  NotFound: 'DOCUMENT_NOT_FOUND',
  InvalidTitle: 'DOCUMENT_INVALID_TITLE',
  InvalidBody: 'DOCUMENT_INVALID_BODY',
  InvalidStatus: 'DOCUMENT_INVALID_STATUS',
  TemplateRequired: 'DOCUMENT_TEMPLATE_REQUIRED',
  TemplateNotFound: 'DOCUMENT_TEMPLATE_NOT_FOUND',
  StorageError: 'DOCUMENT_STORAGE_ERROR',
  PublishedLocked: 'DOCUMENT_PUBLISHED_LOCKED',
  VersionNotFound: 'DOCUMENT_VERSION_NOT_FOUND',
  WorkflowRequired: 'DOCUMENT_WORKFLOW_REQUIRED',
  WorkflowInvalid: 'DOCUMENT_WORKFLOW_INVALID',
  WorkflowForbidden: 'DOCUMENT_WORKFLOW_FORBIDDEN',
  NotApprovedForExport: 'DOCUMENT_NOT_APPROVED_FOR_EXPORT',
  CommentNotFound: 'DOCUMENT_COMMENT_NOT_FOUND',
  CommentInvalidBody: 'DOCUMENT_COMMENT_INVALID_BODY',
  CommentForbidden: 'DOCUMENT_COMMENT_FORBIDDEN',
  WebSlugInvalid: 'DOCUMENT_WEB_SLUG_INVALID',
  WebSlugTaken: 'DOCUMENT_WEB_SLUG_TAKEN',
  WebNotAllowed: 'DOCUMENT_WEB_NOT_ALLOWED',
  WebNotPublished: 'DOCUMENT_WEB_NOT_PUBLISHED',
  ShareNotFound: 'DOCUMENT_SHARE_NOT_FOUND',
  ShareExpired: 'DOCUMENT_SHARE_EXPIRED',
  ShareRevoked: 'DOCUMENT_SHARE_REVOKED',
  SharePasswordRequired: 'DOCUMENT_SHARE_PASSWORD_REQUIRED',
  SharePasswordInvalid: 'DOCUMENT_SHARE_PASSWORD_INVALID',
  ShareRateLimited: 'DOCUMENT_SHARE_RATE_LIMITED',
  ShareInvalidScope: 'DOCUMENT_SHARE_INVALID_SCOPE',
  ShareNotAllowed: 'DOCUMENT_SHARE_NOT_ALLOWED',
} as const;

export type DocumentErrorCode =
  (typeof DocumentErrorCodes)[keyof typeof DocumentErrorCodes];

/** PG metadata — body in Mongo `document_bodies`. */
export type PublicDocument = {
  id: string;
  businessId: string;
  templateId: string | null;
  title: string;
  /** Document content locale (ADR 015) — drives PDF dir/lang + collections. */
  locale: ContentLocale | string;
  status: DocumentStatusValue | string;
  /** Latest version number if any snapshots exist. */
  latestVersionNumber: number | null;
  /** Public web profile slug (ADR 026) — unique per business when set. */
  webSlug: string | null;
  webPublished: boolean;
  webPublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Member view of web-publish settings. */
export type PublicDocumentWebPublish = {
  documentId: string;
  businessId: string;
  webSlug: string | null;
  webPublished: boolean;
  webPublishedAt: string | null;
  /** Relative app path when published, e.g. `/fa/p/{businessId}/{slug}`. */
  publicPath: string | null;
  canPublishToWeb: boolean;
};

/** Unauthenticated public profile payload (Nest → Next). */
export type PublicWebDocumentView = {
  businessId: string;
  documentId: string;
  slug: string;
  title: string;
  locale: ContentLocale | string;
  dir: 'rtl' | 'ltr';
  html: string;
  branding: {
    displayName: string | null;
    primaryColor: string | null;
    hasLogo: boolean;
    logoUrl: string | null;
    showPoweredByEffective: boolean;
  };
};

export const ShareLinkScope = {
  Web: 'web',
  Pdf: 'pdf',
} as const;

export type ShareLinkScopeValue =
  (typeof ShareLinkScope)[keyof typeof ShareLinkScope];

/** Member list item — never includes raw token after create. */
export type PublicDocumentShareLink = {
  id: string;
  businessId: string;
  documentId: string;
  tokenHint: string;
  scope: ShareLinkScopeValue | string;
  hasPassword: boolean;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  /** Relative public path `/s/{token}` only present on create response. */
  publicPath?: string;
  /** Raw token — create response only. */
  token?: string;
};

export type PublicDocumentShareLinkList = {
  items: PublicDocumentShareLink[];
};

/** Public meta before unlock / content. */
export type PublicShareLinkMeta = {
  scope: ShareLinkScopeValue | string;
  title: string;
  locale: ContentLocale | string;
  requiresPassword: boolean;
  unlocked: boolean;
  expired: boolean;
  revoked: boolean;
};

/** Payload after successful access (web scope). */
export type PublicShareLinkWebView = {
  scope: 'web';
  businessId: string;
  documentId: string;
  title: string;
  locale: ContentLocale | string;
  dir: 'rtl' | 'ltr';
  html: string;
  branding: PublicWebDocumentView['branding'];
};

export type PublicShareLinkPdfView = {
  scope: 'pdf';
  businessId: string;
  documentId: string;
  title: string;
  /** Relative API path to stream PDF (session may be required). */
  filePath: string;
};

export const AnalyticsEventKind = {
  View: 'view',
  Download: 'download',
} as const;

export type AnalyticsEventKindValue =
  (typeof AnalyticsEventKind)[keyof typeof AnalyticsEventKind];

export const AnalyticsEventSource = {
  WebPublish: 'web_publish',
  ShareWeb: 'share_web',
  SharePdf: 'share_pdf',
  ExportDownload: 'export_download',
} as const;

export type AnalyticsEventSourceValue =
  (typeof AnalyticsEventSource)[keyof typeof AnalyticsEventSource];

export const AnalyticsDevice = {
  Desktop: 'desktop',
  Mobile: 'mobile',
  Tablet: 'tablet',
  Bot: 'bot',
  Unknown: 'unknown',
} as const;

export type AnalyticsDeviceValue =
  (typeof AnalyticsDevice)[keyof typeof AnalyticsDevice];

export const AnalyticsErrorCodes = {
  Unavailable: 'ANALYTICS_UNAVAILABLE',
} as const;

export type PublicAnalyticsSummary = {
  from: string | null;
  to: string | null;
  totals: { views: number; downloads: number };
  byDay: { day: string; views: number; downloads: number }[];
  byDevice: { device: string; count: number }[];
  byCountry: { country: string; count: number }[];
  byDocument: {
    documentId: string;
    title: string;
    views: number;
    downloads: number;
  }[];
};

export type PublicDocumentDetail = PublicDocument & {
  body: unknown;
};

export type PublicDocumentList = {
  items: PublicDocument[];
  page: number;
  pageSize: number;
  total: number;
};

export const DocumentVersionSource = {
  Publish: 'publish',
  Manual: 'manual',
} as const;

export type DocumentVersionSourceValue =
  (typeof DocumentVersionSource)[keyof typeof DocumentVersionSource];

export type PublicDocumentVersion = {
  id: string;
  businessId: string;
  documentId: string;
  versionNumber: number;
  source: DocumentVersionSourceValue | string;
  note: string | null;
  title: string;
  locale: ContentLocale | string;
  status: DocumentStatusValue | string;
  createdByUserId: string | null;
  createdAt: string;
  /** Lightweight stats for list/compare. */
  stats: {
    schemaVersion: number | null;
    pageCount: number;
    blockCount: number;
    masterCount: number;
  };
};

export type PublicDocumentVersionDetail = PublicDocumentVersion & {
  body: unknown;
};

export type PublicDocumentVersionList = {
  items: PublicDocumentVersion[];
  total: number;
};

export type PublicDocumentVersionCompare = {
  left: PublicDocumentVersion;
  right: PublicDocumentVersion;
  diff: {
    title: boolean;
    locale: boolean;
    status: boolean;
    schemaVersion: boolean;
    pageCount: boolean;
    blockCount: boolean;
    masterCount: boolean;
  };
};

export type PublicDocumentComment = {
  id: string;
  businessId: string;
  documentId: string;
  authorUserId: string;
  body: string;
  pageId: string | null;
  blockId: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicDocumentCommentList = {
  items: PublicDocumentComment[];
  total: number;
  unresolvedCount: number;
};

export const AuditActions = {
  AuthLogin: 'auth.login',
  BusinessCreate: 'business.create',
  BusinessDelete: 'business.delete',
  BillingPaymentSucceeded: 'billing.payment.succeeded',
  BillingLicenseActivated: 'billing.license.activated',
  ExportPdfEnqueued: 'export.pdf.enqueued',
  DocumentDelete: 'document.delete',
  DocumentWorkflowSubmit: 'document.workflow.submit',
  DocumentWorkflowApprove: 'document.workflow.approve',
  DocumentWorkflowReject: 'document.workflow.reject',
  DocumentWorkflowPublish: 'document.workflow.publish',
  DocumentWorkflowUnpublish: 'document.workflow.unpublish',
  DocumentWorkflowReopen: 'document.workflow.reopen',
  WorkspaceBackupCompleted: 'workspace.backup.completed',
  WorkspaceRestoreCompleted: 'workspace.restore.completed',
  MembershipInvite: 'membership.invite',
  MembershipAccept: 'membership.accept',
  MembershipRoleChange: 'membership.role_change',
  MembershipRemove: 'membership.remove',
  DocumentWebPublish: 'document.web.publish',
  DocumentWebUnpublish: 'document.web.unpublish',
  DocumentShareCreate: 'document.share.create',
  DocumentShareRevoke: 'document.share.revoke',
  PlatformBusinessSuspend: 'platform.business.suspend',
  PlatformBusinessUnsuspend: 'platform.business.unsuspend',
  BillingSubscriptionGrace: 'billing.subscription.grace',
  BillingSubscriptionExpired: 'billing.subscription.expired',
  BillingDunningNotice: 'billing.dunning.notice',
} as const;

export type AuditAction =
  (typeof AuditActions)[keyof typeof AuditActions];

export type PublicAuditEvent = {
  id: string;
  businessId: string | null;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
};

export type PublicAuditEventList = {
  items: PublicAuditEvent[];
  total: number;
  page: number;
  pageSize: number;
};

export const ExportJobStatus = {
  Queued: 'queued',
  Processing: 'processing',
  Completed: 'completed',
  Failed: 'failed',
} as const;

export type ExportJobStatusValue =
  (typeof ExportJobStatus)[keyof typeof ExportJobStatus];

export const ExportErrorCodes = {
  NotFound: 'EXPORT_NOT_FOUND',
  DocumentNotFound: 'EXPORT_DOCUMENT_NOT_FOUND',
  NotReady: 'EXPORT_NOT_READY',
  Failed: 'EXPORT_FAILED',
  QueueUnavailable: 'EXPORT_QUEUE_UNAVAILABLE',
  RenderFailed: 'EXPORT_RENDER_FAILED',
  RateLimited: 'EXPORT_RATE_LIMITED',
  TooManyConcurrent: 'EXPORT_TOO_MANY_CONCURRENT',
} as const;

export type ExportErrorCode =
  (typeof ExportErrorCodes)[keyof typeof ExportErrorCodes];

export type PublicExportJob = {
  id: string;
  businessId: string;
  documentId: string;
  status: ExportJobStatusValue | string;
  errorCode: string | null;
  errorMessage: string | null;
  byteSize: number | null;
  mimeType: string;
  downloadUrl: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

/** Portfolio / project status (ContentModule — gated by module.projects). */
export const ProjectStatus = {
  Draft: 'draft',
  Published: 'published',
  Archived: 'archived',
} as const;

export type ProjectStatusValue =
  (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const ProjectErrorCodes = {
  NotFound: 'PROJECT_NOT_FOUND',
  CategoryNotFound: 'PROJECT_CATEGORY_NOT_FOUND',
  InvalidTitle: 'PROJECT_INVALID_TITLE',
  InvalidStatus: 'PROJECT_INVALID_STATUS',
  InvalidFields: 'PROJECT_INVALID_FIELDS',
  MediaNotFound: 'PROJECT_MEDIA_NOT_FOUND',
  CategoryInUse: 'PROJECT_CATEGORY_IN_USE',
  LocationNotFound: 'PROJECT_LOCATION_NOT_FOUND',
} as const;

export type ProjectErrorCode =
  (typeof ProjectErrorCodes)[keyof typeof ProjectErrorCodes];

export type PublicProjectCategory = {
  id: string;
  businessId: string;
  name: string;
  translations: EntityTranslations;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicProjectCategoryList = {
  items: PublicProjectCategory[];
  page: number;
  pageSize: number;
  total: number;
};

export type PublicProject = {
  id: string;
  businessId: string;
  categoryId: string | null;
  categoryName: string | null;
  title: string;
  description: string;
  translations: EntityTranslations;
  status: ProjectStatusValue | string;
  coverMediaId: string | null;
  mediaIds: string[];
  /** Optional FK to shared Location entity. */
  locationId: string | null;
  locationName: string | null;
  fields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PublicProjectList = {
  items: PublicProject[];
  page: number;
  pageSize: number;
  total: number;
};

/** Team / branches — foundational Content (writable gate; feeds Org Chart & Map). */
export const TeamErrorCodes = {
  MemberNotFound: 'TEAM_MEMBER_NOT_FOUND',
  BranchNotFound: 'BRANCH_NOT_FOUND',
  InvalidName: 'TEAM_INVALID_NAME',
  InvalidFields: 'TEAM_INVALID_FIELDS',
  MediaNotFound: 'TEAM_MEDIA_NOT_FOUND',
  BranchInUse: 'BRANCH_IN_USE',
  LocationNotFound: 'BRANCH_LOCATION_NOT_FOUND',
  InvalidParent: 'TEAM_INVALID_PARENT',
  ParentCycle: 'TEAM_PARENT_CYCLE',
} as const;

export type TeamErrorCode =
  (typeof TeamErrorCodes)[keyof typeof TeamErrorCodes];

export type PublicTeamMember = {
  id: string;
  businessId: string;
  branchId: string | null;
  branchName: string | null;
  parentMemberId: string | null;
  name: string;
  roleTitle: string;
  department: string;
  translations: EntityTranslations;
  photoMediaId: string | null;
  sortOrder: number;
  fields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PublicTeamMemberList = {
  items: PublicTeamMember[];
  page: number;
  pageSize: number;
  total: number;
};

export type PublicBranch = {
  id: string;
  businessId: string;
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone: string;
  translations: EntityTranslations;
  /** Optional FK to shared Location entity. */
  locationId: string | null;
  locationName: string | null;
  sortOrder: number;
  fields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PublicBranchList = {
  items: PublicBranch[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * Services / Clients / Certificates — foundational Content (writable gate; no sellable module).
 */
export const ProfileContentErrorCodes = {
  ServiceNotFound: 'SERVICE_NOT_FOUND',
  ClientNotFound: 'CLIENT_NOT_FOUND',
  CertificateNotFound: 'CERTIFICATE_NOT_FOUND',
  InvalidName: 'PROFILE_INVALID_NAME',
  InvalidFields: 'PROFILE_INVALID_FIELDS',
  InvalidDate: 'PROFILE_INVALID_DATE',
  MediaNotFound: 'PROFILE_MEDIA_NOT_FOUND',
} as const;

export type ProfileContentErrorCode =
  (typeof ProfileContentErrorCodes)[keyof typeof ProfileContentErrorCodes];

export type PublicBusinessService = {
  id: string;
  businessId: string;
  name: string;
  description: string;
  translations: EntityTranslations;
  iconMediaId: string | null;
  sortOrder: number;
  fields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PublicBusinessServiceList = {
  items: PublicBusinessService[];
  page: number;
  pageSize: number;
  total: number;
};

export type PublicClient = {
  id: string;
  businessId: string;
  name: string;
  website: string;
  translations: EntityTranslations;
  logoMediaId: string | null;
  sortOrder: number;
  fields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PublicClientList = {
  items: PublicClient[];
  page: number;
  pageSize: number;
  total: number;
};

export type PublicCertificate = {
  id: string;
  businessId: string;
  name: string;
  issuer: string;
  translations: EntityTranslations;
  issuedAt: string | null;
  expiresAt: string | null;
  documentMediaId: string | null;
  sortOrder: number;
  fields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PublicCertificateList = {
  items: PublicCertificate[];
  page: number;
  pageSize: number;
  total: number;
};

/** Gallery albums — gated by module.gallery. */
export const GalleryErrorCodes = {
  NotFound: 'GALLERY_NOT_FOUND',
  ItemNotFound: 'GALLERY_ITEM_NOT_FOUND',
  InvalidName: 'GALLERY_INVALID_NAME',
  InvalidCaption: 'GALLERY_INVALID_CAPTION',
  MediaNotFound: 'GALLERY_MEDIA_NOT_FOUND',
  InvalidReorder: 'GALLERY_INVALID_REORDER',
} as const;

export type GalleryErrorCode =
  (typeof GalleryErrorCodes)[keyof typeof GalleryErrorCodes];

export type PublicGalleryItem = {
  id: string;
  businessId: string;
  galleryId: string;
  mediaId: string;
  caption: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicGallery = {
  id: string;
  businessId: string;
  name: string;
  description: string;
  sortOrder: number;
  itemCount: number;
  items?: PublicGalleryItem[];
  createdAt: string;
  updatedAt: string;
};

export type PublicGalleryList = {
  items: PublicGallery[];
  page: number;
  pageSize: number;
  total: number;
};

/** Shared geography — foundational Content (writable gate; feeds Map). */
export const LocationErrorCodes = {
  NotFound: 'LOCATION_NOT_FOUND',
  InvalidName: 'LOCATION_INVALID_NAME',
  InvalidCoordinates: 'LOCATION_INVALID_COORDINATES',
  InUse: 'LOCATION_IN_USE',
} as const;

export type LocationErrorCode =
  (typeof LocationErrorCodes)[keyof typeof LocationErrorCodes];

export type PublicLocation = {
  id: string;
  businessId: string;
  name: string;
  country: string;
  province: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicLocationList = {
  items: PublicLocation[];
  page: number;
  pageSize: number;
  total: number;
};

/** Map markers — gated by module.map. */
export const MapErrorCodes = {
  InvalidSource: 'MAP_INVALID_SOURCE',
} as const;

export type MapErrorCode =
  (typeof MapErrorCodes)[keyof typeof MapErrorCodes];

export type PublicMapMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country: string;
  /** locations | branches | projects */
  source: string;
};

export type PublicMapMarkerList = {
  items: PublicMapMarker[];
  source: string;
  countryRestriction: string | null;
};

/** Org chart tree — gated by module.org_chart; nodes from team_members. */
export const OrgChartErrorCodes = {
  RootNotFound: 'ORG_CHART_ROOT_NOT_FOUND',
} as const;

export type OrgChartErrorCode =
  (typeof OrgChartErrorCodes)[keyof typeof OrgChartErrorCodes];

export type PublicOrgChartNode = {
  id: string;
  name: string;
  roleTitle: string;
  department: string;
  photoMediaId: string | null;
  parentMemberId: string | null;
  sortOrder: number;
  children: PublicOrgChartNode[];
};

export type PublicOrgChartTree = {
  roots: PublicOrgChartNode[];
  rootMemberId: string | null;
  memberCount: number;
};

/** Timeline events — gated by module.timeline. */
export const TimelineErrorCodes = {
  NotFound: 'TIMELINE_EVENT_NOT_FOUND',
  InvalidTitle: 'TIMELINE_INVALID_TITLE',
  InvalidDate: 'TIMELINE_INVALID_DATE',
  InvalidFields: 'TIMELINE_INVALID_FIELDS',
  MediaNotFound: 'TIMELINE_MEDIA_NOT_FOUND',
} as const;

export type TimelineErrorCode =
  (typeof TimelineErrorCodes)[keyof typeof TimelineErrorCodes];

export type PublicTimelineEvent = {
  id: string;
  businessId: string;
  occurredAt: string;
  title: string;
  body: string;
  translations: EntityTranslations;
  mediaId: string | null;
  sortOrder: number;
  fields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PublicTimelineEventList = {
  items: PublicTimelineEvent[];
  page: number;
  pageSize: number;
  total: number;
};

/** QR encode — core block (no sellable module). */
export const QrErrorCodes = {
  EmptyPayload: 'QR_EMPTY_PAYLOAD',
  EncodeFailed: 'QR_ENCODE_FAILED',
} as const;

export type QrErrorCode = (typeof QrErrorCodes)[keyof typeof QrErrorCodes];

export type PublicQrEncode = {
  payload: string;
  dataUrl: string;
  sizePx: number;
};

/** Flat collection items for repeater `{{item.*}}` binding. */
export const CollectionErrorCodes = {
  InvalidSource: 'COLLECTION_INVALID_SOURCE',
} as const;

export type CollectionErrorCode =
  (typeof CollectionErrorCodes)[keyof typeof CollectionErrorCodes];

export type PublicCollectionItem = {
  id: string;
  /** Flat string map for {{item.key}} placeholders. */
  values: Record<string, string>;
};

export type PublicCollectionList = {
  source: string;
  items: PublicCollectionItem[];
  /** Total matching rows (not limited by page size). */
  total: number;
};

/** Bulk content import (Excel/CSV) — ADR 019; MVP entity = projects. */
export const ImportJobStatus = {
  Uploaded: 'uploaded',
  Mapped: 'mapped',
  Queued: 'queued',
  Processing: 'processing',
  Completed: 'completed',
  Failed: 'failed',
} as const;

export type ImportJobStatusValue =
  (typeof ImportJobStatus)[keyof typeof ImportJobStatus];

export const ImportEntityType = {
  Projects: 'projects',
} as const;

export type ImportEntityTypeValue =
  (typeof ImportEntityType)[keyof typeof ImportEntityType];

export const ImportFileFormat = {
  Csv: 'csv',
  Xlsx: 'xlsx',
} as const;

export type ImportFileFormatValue =
  (typeof ImportFileFormat)[keyof typeof ImportFileFormat];

/** Target fields for project column mapping. */
export const ProjectImportField = {
  Title: 'title',
  Description: 'description',
  Status: 'status',
  Category: 'category',
  Location: 'location',
  TitleEn: 'titleEn',
  DescriptionEn: 'descriptionEn',
  Year: 'year',
} as const;

export type ProjectImportFieldValue =
  (typeof ProjectImportField)[keyof typeof ProjectImportField];

export const PROJECT_IMPORT_FIELDS = Object.values(ProjectImportField);

export const ImportErrorCodes = {
  NotFound: 'IMPORT_NOT_FOUND',
  FileRequired: 'IMPORT_FILE_REQUIRED',
  FileTooLarge: 'IMPORT_FILE_TOO_LARGE',
  InvalidFormat: 'IMPORT_INVALID_FORMAT',
  ParseFailed: 'IMPORT_PARSE_FAILED',
  TooManyRows: 'IMPORT_TOO_MANY_ROWS',
  MappingRequired: 'IMPORT_MAPPING_REQUIRED',
  TitleColumnRequired: 'IMPORT_TITLE_COLUMN_REQUIRED',
  InvalidMapping: 'IMPORT_INVALID_MAPPING',
  InvalidState: 'IMPORT_INVALID_STATE',
  Empty: 'IMPORT_EMPTY',
  CommitFailed: 'IMPORT_COMMIT_FAILED',
} as const;

export type ImportErrorCode =
  (typeof ImportErrorCodes)[keyof typeof ImportErrorCodes];

export type ImportColumnMapping = Partial<
  Record<ProjectImportFieldValue, string>
>;

export type ImportRowError = {
  row: number;
  code: string;
  message: string;
};

export type ImportPreview = {
  headers: string[];
  totalRows: number;
  sampleRows: Record<string, string>[];
  /** Mapped sample (after mapping applied). */
  mappedSample?: Record<string, string>[];
  errorCount: number;
  sampleErrors: ImportRowError[];
};

export type ImportResult = {
  created: number;
  skipped: number;
  errors: ImportRowError[];
};

export type PublicImportJob = {
  id: string;
  businessId: string;
  entityType: ImportEntityTypeValue | string;
  status: ImportJobStatusValue | string;
  format: ImportFileFormatValue | string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  mapping: ImportColumnMapping | null;
  preview: ImportPreview | null;
  result: ImportResult | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

/** ZIP package kind — see ADR 024. */
export const BUSINESS_BACKUP_KIND = 'vdb.business-backup' as const;
export const BUSINESS_BACKUP_FORMAT_VERSION = 1 as const;

export const WorkspaceBackupStatus = {
  Queued: 'queued',
  Processing: 'processing',
  Completed: 'completed',
  Failed: 'failed',
} as const;

export type WorkspaceBackupStatusValue =
  (typeof WorkspaceBackupStatus)[keyof typeof WorkspaceBackupStatus];

export const WorkspaceRestoreStatus = {
  Uploaded: 'uploaded',
  Queued: 'queued',
  Processing: 'processing',
  Completed: 'completed',
  Failed: 'failed',
} as const;

export type WorkspaceRestoreStatusValue =
  (typeof WorkspaceRestoreStatus)[keyof typeof WorkspaceRestoreStatus];

export const BackupErrorCodes = {
  NotFound: 'BACKUP_NOT_FOUND',
  NotReady: 'BACKUP_NOT_READY',
  Failed: 'BACKUP_FAILED',
  QueueUnavailable: 'BACKUP_QUEUE_UNAVAILABLE',
  InvalidPackage: 'BACKUP_INVALID_PACKAGE',
  UnsupportedVersion: 'BACKUP_UNSUPPORTED_VERSION',
  FileRequired: 'BACKUP_FILE_REQUIRED',
  FileTooLarge: 'BACKUP_FILE_TOO_LARGE',
  RestoreNotFound: 'BACKUP_RESTORE_NOT_FOUND',
  RestoreInvalidState: 'BACKUP_RESTORE_INVALID_STATE',
  TargetNotEmpty: 'BACKUP_RESTORE_TARGET_NOT_EMPTY',
  RestoreFailed: 'BACKUP_RESTORE_FAILED',
} as const;

export type BackupErrorCode =
  (typeof BackupErrorCodes)[keyof typeof BackupErrorCodes];

export type BusinessBackupCounts = {
  designThemes: number;
  fontFaces: number;
  mediaAssets: number;
  templates: number;
  documents: number;
  documentVersions: number;
  documentComments: number;
  projectCategories: number;
  projects: number;
  branches: number;
  teamMembers: number;
  services: number;
  clients: number;
  certificates: number;
  galleries: number;
  galleryItems: number;
  locations: number;
  timelineEvents: number;
  templateBodies: number;
  documentBodies: number;
  documentVersionBodies: number;
  mediaFiles: number;
  fontFiles: number;
};

export type BusinessBackupManifest = {
  kind: typeof BUSINESS_BACKUP_KIND;
  formatVersion: number;
  createdAt: string;
  source: { businessId: string; name: string };
  counts: BusinessBackupCounts;
};

export type PublicWorkspaceBackupJob = {
  id: string;
  businessId: string;
  status: WorkspaceBackupStatusValue | string;
  byteSize: number | null;
  mimeType: string;
  manifest: BusinessBackupManifest | null;
  errorCode: string | null;
  errorMessage: string | null;
  downloadUrl: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type PublicWorkspaceRestoreJob = {
  id: string;
  businessId: string;
  status: WorkspaceRestoreStatusValue | string;
  originalFilename: string;
  byteSize: number;
  mimeType: string;
  preview: BusinessBackupManifest | null;
  result: { remappedEntities: number } | null;
  confirmReplace: boolean;
  targetEmpty: boolean | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

