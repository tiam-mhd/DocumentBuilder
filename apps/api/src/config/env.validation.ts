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
  SMS_PROVIDER: 'fake' | 'http';
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
  STORAGE_DRIVER: 'local' | 's3';
  STORAGE_LOCAL_ROOT: string;
  MEDIA_MAX_BYTES: number;
  FONT_MAX_BYTES: number;
  PDF_RENDERER: 'fake' | 'playwright';
  S3_ENDPOINT: string;
  S3_REGION: string;
  S3_BUCKET: string;
  S3_ACCESS_KEY: string;
  S3_SECRET_KEY: string;
  S3_FORCE_PATH_STYLE: boolean;
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
  if (smsProviderRaw !== 'fake' && smsProviderRaw !== 'http') {
    throw new Error(`SMS_PROVIDER must be fake|http (got: ${smsProviderRaw})`);
  }

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
    SMS_PROVIDER: smsProviderRaw,
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
    STORAGE_DRIVER: storageDriverRaw,
    STORAGE_LOCAL_ROOT: localRoot,
    MEDIA_MAX_BYTES: Number(config.MEDIA_MAX_BYTES ?? 10 * 1024 * 1024),
    FONT_MAX_BYTES: Number(config.FONT_MAX_BYTES ?? 5 * 1024 * 1024),
    PDF_RENDERER:
      String(config.PDF_RENDERER ?? 'fake') === 'playwright'
        ? 'playwright'
        : 'fake',
    S3_ENDPOINT: String(config.S3_ENDPOINT ?? ''),
    S3_REGION: String(config.S3_REGION ?? 'us-east-1'),
    S3_BUCKET: String(config.S3_BUCKET ?? ''),
    S3_ACCESS_KEY: String(config.S3_ACCESS_KEY ?? ''),
    S3_SECRET_KEY: String(config.S3_SECRET_KEY ?? ''),
    S3_FORCE_PATH_STYLE: s3ForcePathStyle,
  };
}
