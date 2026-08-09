export enum SubscriptionStatus {
  Trial = 'trial',
  Active = 'active',
  Grace = 'grace',
  Expired = 'expired',
  PendingPayment = 'pending_payment',
}

export const TRIAL_DURATION_DAYS = 7 as const;

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

export type PublicSubscription = {
  id: string;
  businessId: string;
  planId: string | null;
  planCode: string | null;
  status: SubscriptionStatus;
  /** Status after applying endsAt clock (may differ from stored status). */
  effectiveStatus: SubscriptionStatus;
  writable: boolean;
  startsAt: string;
  endsAt: string | null;
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
  Member = 'MEMBER',
}

export const TenancyErrorCodes = {
  BusinessNotFound: 'BUSINESS_NOT_FOUND',
  BusinessForbidden: 'BUSINESS_FORBIDDEN',
  BusinessNameInvalid: 'BUSINESS_NAME_INVALID',
} as const;

export type TenancyErrorCode =
  (typeof TenancyErrorCodes)[keyof typeof TenancyErrorCodes];

export type PublicBusiness = {
  id: string;
  name: string;
  role: MembershipRole;
  createdAt: string;
  updatedAt: string;
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

export type PublicBlockRegistryEntry = {
  type: string;
  labelKey: string;
  allowsChildren: boolean;
  moduleCode: string | null;
};

export type PublicBlockRegistry = {
  schemaVersion: number;
  items: PublicBlockRegistryEntry[];
};

export const DocumentStatus = {
  Draft: 'draft',
  Published: 'published',
} as const;

export type DocumentStatusValue =
  (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const DocumentErrorCodes = {
  NotFound: 'DOCUMENT_NOT_FOUND',
  InvalidTitle: 'DOCUMENT_INVALID_TITLE',
  InvalidBody: 'DOCUMENT_INVALID_BODY',
  InvalidStatus: 'DOCUMENT_INVALID_STATUS',
  TemplateRequired: 'DOCUMENT_TEMPLATE_REQUIRED',
  TemplateNotFound: 'DOCUMENT_TEMPLATE_NOT_FOUND',
  StorageError: 'DOCUMENT_STORAGE_ERROR',
} as const;

export type DocumentErrorCode =
  (typeof DocumentErrorCodes)[keyof typeof DocumentErrorCodes];

/** PG metadata — body in Mongo `document_bodies`. */
export type PublicDocument = {
  id: string;
  businessId: string;
  templateId: string | null;
  title: string;
  status: DocumentStatusValue | string;
  createdAt: string;
  updatedAt: string;
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
