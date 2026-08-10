import { AppEdition } from '@vdb/shared-types';
import * as path from 'path';

export type AppEnv = {
  NODE_ENV: string;
  APP_EDITION: AppEdition;
  API_PORT: number;
  API_PREFIX: string;
  CORS_ORIGINS: string;
  DATABASE_URL: string;
  REDIS_URL: string;
  MONGODB_URI: string;
  OTP_PEPPER: string;
  SMS_PROVIDER: 'fake' | 'parsgreen';
  /** Parsgreen Apiv2 token (Authorization: basic apikey:{token}). May be empty until deploy. */
  PARSGREEN_API_TOKEN: string;
  PARSGREEN_BASE_URL: string;
  PARSGREEN_ADD_NAME: boolean;
  OTP_TTL_SECONDS: number;
  OTP_COOLDOWN_SECONDS: number;
  OTP_MAX_ATTEMPTS: number;
  OTP_RATE_MAX: number;
  OTP_RATE_WINDOW_SECONDS: number;
  JWT_SECRET: string;
  JWT_EXPIRES_SECONDS: number;
  PAYMENT_PROVIDER: 'fake' | 'zarinpal';
  ZARINPAL_MERCHANT_ID: string;
  ZARINPAL_SANDBOX: boolean;
  WEB_ORIGIN: string;
  API_PUBLIC_URL: string;
  LICENSE_PEPPER: string;
  LICENSE_ISSUER_SECRET: string;
  SHARE_LINK_PEPPER: string;
  SHARE_LINK_PASSWORD_MAX_ATTEMPTS: number;
  SHARE_LINK_PASSWORD_WINDOW_SECONDS: number;
  SHARE_LINK_SESSION_SECONDS: number;
  ANALYTICS_ENABLED: boolean;
  STORAGE_DRIVER: 'local' | 's3';
  STORAGE_LOCAL_ROOT: string;
  MEDIA_MAX_BYTES: number;
  FONT_MAX_BYTES: number;
  IMPORT_MAX_BYTES: number;
  IMPORT_MAX_ROWS: number;
  IMPORT_SYNC_MAX_ROWS: number;
  BACKUP_MAX_BYTES: number;
  PDF_RENDERER: 'fake' | 'playwright';
  /** Empty or `none` = placeholder box in PDF; otherwise URL template with {lat},{lng},{zoom},{w},{h},{markers}. */
  MAP_STATIC_URL_TEMPLATE: string;
  S3_ENDPOINT: string;
  S3_REGION: string;
  S3_BUCKET: string;
  S3_ACCESS_KEY: string;
  S3_SECRET_KEY: string;
  S3_FORCE_PATH_STYLE: boolean;
  /** Comma-separated mobiles granted platform_admin on seed (SAAS). */
  PLATFORM_ADMIN_MOBILES: string;
  /** Comma-separated client IPs allowed for platform-admin routes; empty = all. */
  PLATFORM_ADMIN_IP_ALLOWLIST: string;
  /** Days of writable grace after endsAt (SAAS dunning). */
  BILLING_GRACE_DAYS: number;
  /** Trust X-Forwarded-* when behind a reverse proxy. */
  TRUST_PROXY: boolean;
  /** Max queued+processing PDF jobs per Business. */
  EXPORT_MAX_CONCURRENT_PER_BUSINESS: number;
  /** Redis rate limit: max PDF enqueues per business per window. */
  EXPORT_RATE_MAX: number;
  EXPORT_RATE_WINDOW_SECONDS: number;
  /** BullMQ export worker concurrency. */
  EXPORT_WORKER_CONCURRENCY: number;
};

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const editionRaw = String(config.APP_EDITION ?? 'SAAS');
  if (
    editionRaw !== AppEdition.SelfHosted &&
    editionRaw !== AppEdition.Saas
  ) {
    throw new Error(
      `APP_EDITION must be SELF_HOSTED or SAAS (got: ${editionRaw})`,
    );
  }

  const databaseUrl = String(config.DATABASE_URL ?? '');
  const redisUrl = String(config.REDIS_URL ?? '');
  const mongoUri = String(config.MONGODB_URI ?? '');
  const otpPepper = String(config.OTP_PEPPER ?? 'dev-only-otp-pepper-change-me');
  const jwtSecret = String(
    config.JWT_SECRET ?? 'dev-only-jwt-secret-change-me',
  );
  const smsProviderRaw = String(config.SMS_PROVIDER ?? 'fake');
  if (smsProviderRaw !== 'fake' && smsProviderRaw !== 'parsgreen') {
    throw new Error(
      `SMS_PROVIDER must be fake|parsgreen (got: ${smsProviderRaw})`,
    );
  }

  const parsgreenAddRaw = String(config.PARSGREEN_ADD_NAME ?? 'true');
  const parsgreenAddName =
    parsgreenAddRaw === '1' || parsgreenAddRaw.toLowerCase() === 'true';

  const paymentProviderRaw = String(config.PAYMENT_PROVIDER ?? 'fake');
  if (paymentProviderRaw !== 'fake' && paymentProviderRaw !== 'zarinpal') {
    throw new Error(
      `PAYMENT_PROVIDER must be fake|zarinpal (got: ${paymentProviderRaw})`,
    );
  }

  const storageDriverRaw = String(config.STORAGE_DRIVER ?? 'local');
  if (storageDriverRaw !== 'local' && storageDriverRaw !== 's3') {
    throw new Error(
      `STORAGE_DRIVER must be local|s3 (got: ${storageDriverRaw})`,
    );
  }

  const zarinpalSandboxRaw = String(config.ZARINPAL_SANDBOX ?? 'true');
  const zarinpalSandbox =
    zarinpalSandboxRaw === '1' ||
    zarinpalSandboxRaw.toLowerCase() === 'true';

  const s3ForceRaw = String(config.S3_FORCE_PATH_STYLE ?? 'true');
  const s3ForcePathStyle =
    s3ForceRaw === '1' || s3ForceRaw.toLowerCase() === 'true';

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  if (!redisUrl) {
    throw new Error('REDIS_URL is required');
  }
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required');
  }
  if (!jwtSecret || jwtSecret.length < 16) {
    throw new Error('JWT_SECRET must be at least 16 characters');
  }

  if (
    paymentProviderRaw === 'zarinpal' &&
    !String(config.ZARINPAL_MERCHANT_ID ?? '').trim()
  ) {
    throw new Error(
      'ZARINPAL_MERCHANT_ID is required when PAYMENT_PROVIDER=zarinpal',
    );
  }

  const licensePepper = String(
    config.LICENSE_PEPPER ?? 'dev-only-license-pepper-change-me',
  );
  if (licensePepper.length < 16) {
    throw new Error('LICENSE_PEPPER must be at least 16 characters');
  }

  const sharePepper = String(config.SHARE_LINK_PEPPER || otpPepper);
  if (sharePepper.length < 16) {
    throw new Error('SHARE_LINK_PEPPER must be at least 16 characters');
  }

  if (storageDriverRaw === 's3') {
    for (const key of ['S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'] as const) {
      if (!String(config[key] ?? '').trim()) {
        throw new Error(`${key} is required when STORAGE_DRIVER=s3`);
      }
    }
  }

  const localRoot = String(
    config.STORAGE_LOCAL_ROOT ??
      path.join(process.cwd(), '.data', 'object-storage'),
  );

  return {
    NODE_ENV: String(config.NODE_ENV ?? 'development'),
    APP_EDITION: editionRaw as AppEdition,
    API_PORT: Number(config.API_PORT ?? 3001),
    API_PREFIX: String(config.API_PREFIX ?? 'api'),
    CORS_ORIGINS: String(config.CORS_ORIGINS ?? 'http://localhost:3000'),
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
    MONGODB_URI: mongoUri,
    OTP_PEPPER: otpPepper,
    SMS_PROVIDER: smsProviderRaw as 'fake' | 'parsgreen',
    PARSGREEN_API_TOKEN: String(config.PARSGREEN_API_TOKEN ?? ''),
    PARSGREEN_BASE_URL: String(
      config.PARSGREEN_BASE_URL ?? 'https://sms.parsgreen.ir',
    ).replace(/\/$/, ''),
    PARSGREEN_ADD_NAME: parsgreenAddName,
    OTP_TTL_SECONDS: Number(config.OTP_TTL_SECONDS ?? 300),
    OTP_COOLDOWN_SECONDS: Number(config.OTP_COOLDOWN_SECONDS ?? 60),
    OTP_MAX_ATTEMPTS: Number(config.OTP_MAX_ATTEMPTS ?? 5),
    OTP_RATE_MAX: Number(config.OTP_RATE_MAX ?? 5),
    OTP_RATE_WINDOW_SECONDS: Number(config.OTP_RATE_WINDOW_SECONDS ?? 900),
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_SECONDS: Number(config.JWT_EXPIRES_SECONDS ?? 604800),
    PAYMENT_PROVIDER: paymentProviderRaw,
    ZARINPAL_MERCHANT_ID: String(config.ZARINPAL_MERCHANT_ID ?? ''),
    ZARINPAL_SANDBOX: zarinpalSandbox,
    WEB_ORIGIN: String(config.WEB_ORIGIN ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    ),
    API_PUBLIC_URL: String(
      config.API_PUBLIC_URL ?? 'http://localhost:3001/api',
    ).replace(/\/$/, ''),
    LICENSE_PEPPER: licensePepper,
    LICENSE_ISSUER_SECRET: String(config.LICENSE_ISSUER_SECRET ?? ''),
    SHARE_LINK_PEPPER: sharePepper,
    SHARE_LINK_PASSWORD_MAX_ATTEMPTS: Number(
      config.SHARE_LINK_PASSWORD_MAX_ATTEMPTS ?? 10,
    ),
    SHARE_LINK_PASSWORD_WINDOW_SECONDS: Number(
      config.SHARE_LINK_PASSWORD_WINDOW_SECONDS ?? 900,
    ),
    SHARE_LINK_SESSION_SECONDS: Number(
      config.SHARE_LINK_SESSION_SECONDS ?? 900,
    ),
    ANALYTICS_ENABLED: !['0', 'false', 'no', 'off'].includes(
      String(config.ANALYTICS_ENABLED ?? 'true').toLowerCase(),
    ),
    STORAGE_DRIVER: storageDriverRaw,
    STORAGE_LOCAL_ROOT: localRoot,
    MEDIA_MAX_BYTES: Number(config.MEDIA_MAX_BYTES ?? 10 * 1024 * 1024),
    FONT_MAX_BYTES: Number(config.FONT_MAX_BYTES ?? 5 * 1024 * 1024),
    IMPORT_MAX_BYTES: Number(config.IMPORT_MAX_BYTES ?? 5 * 1024 * 1024),
    IMPORT_MAX_ROWS: Number(config.IMPORT_MAX_ROWS ?? 5000),
    IMPORT_SYNC_MAX_ROWS: Number(config.IMPORT_SYNC_MAX_ROWS ?? 100),
    BACKUP_MAX_BYTES: Number(config.BACKUP_MAX_BYTES ?? 100 * 1024 * 1024),
    PDF_RENDERER:
      String(config.PDF_RENDERER ?? 'fake') === 'playwright'
        ? 'playwright'
        : 'fake',
    MAP_STATIC_URL_TEMPLATE: String(config.MAP_STATIC_URL_TEMPLATE ?? 'none'),
    S3_ENDPOINT: String(config.S3_ENDPOINT ?? ''),
    S3_REGION: String(config.S3_REGION ?? 'us-east-1'),
    S3_BUCKET: String(config.S3_BUCKET ?? ''),
    S3_ACCESS_KEY: String(config.S3_ACCESS_KEY ?? ''),
    S3_SECRET_KEY: String(config.S3_SECRET_KEY ?? ''),
    S3_FORCE_PATH_STYLE: s3ForcePathStyle,
    PLATFORM_ADMIN_MOBILES: String(config.PLATFORM_ADMIN_MOBILES ?? ''),
    PLATFORM_ADMIN_IP_ALLOWLIST: String(
      config.PLATFORM_ADMIN_IP_ALLOWLIST ?? '',
    ),
    BILLING_GRACE_DAYS: Number(config.BILLING_GRACE_DAYS ?? 3),
    TRUST_PROXY: ['1', 'true', 'yes', 'on'].includes(
      String(config.TRUST_PROXY ?? 'false').toLowerCase(),
    ),
    EXPORT_MAX_CONCURRENT_PER_BUSINESS: Number(
      config.EXPORT_MAX_CONCURRENT_PER_BUSINESS ?? 2,
    ),
    EXPORT_RATE_MAX: Number(config.EXPORT_RATE_MAX ?? 10),
    EXPORT_RATE_WINDOW_SECONDS: Number(
      config.EXPORT_RATE_WINDOW_SECONDS ?? 60,
    ),
    EXPORT_WORKER_CONCURRENCY: Math.max(
      1,
      Number(config.EXPORT_WORKER_CONCURRENCY ?? 1),
    ),
  };
}
