import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createConnection } from 'node:net';

type PrismaErrorDetails = {
  name?: unknown;
  code?: unknown;
  errorCode?: unknown;
  meta?: unknown;
  message?: unknown;
  cause?: unknown;
};

const SAFE_POSTGRES_ERROR_CODES = [
  'P1000',
  'P1001',
  'P1002',
  'P1003',
  'P1010',
  'P1011',
  'P1012',
  'P1013',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EHOSTDOWN',
  'EACCES',
  'EPIPE',
  '28P01',
  '3D000',
  '42501',
  '53300',
  '57P03',
  '08001',
  '08006',
] as const;

const SAFE_POSTGRES_ERROR_SIGNATURES = [
  {
    pattern: /can't reach database server|could not connect to server/i,
    code: 'DB_UNREACHABLE',
  },
  {
    pattern: /password authentication failed|authentication failed/i,
    code: 'DB_AUTHENTICATION_FAILED',
  },
  { pattern: /database .* does not exist/i, code: 'DB_NAME_NOT_FOUND' },
  { pattern: /connection refused/i, code: 'CONNECTION_REFUSED' },
  {
    pattern: /getaddrinfo .* (?:not found|failed)|name or service not known/i,
    code: 'DNS_LOOKUP_FAILED',
  },
  { pattern: /timeout|timed out/i, code: 'CONNECTION_TIMEOUT' },
  { pattern: /no pg_hba\.conf entry/i, code: 'PG_HBA_REJECTED' },
] as const;

function safeErrorToken(value: unknown) {
  return typeof value === 'string'
    ? value.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 48)
    : '';
}

function postgresErrorLabel(error: unknown, depth = 0): string {
  if (!error || typeof error !== 'object' || depth > 3) return 'UNKNOWN';

  const details = error as PrismaErrorDetails;
  const meta =
    details.meta && typeof details.meta === 'object'
      ? (details.meta as { code?: unknown })
      : undefined;
  const name = safeErrorToken(details.name) || 'Error';
  const message = typeof details.message === 'string' ? details.message : '';
  const directCode = [details.errorCode, details.code, meta?.code]
    .map(safeErrorToken)
    .find((candidate) =>
      SAFE_POSTGRES_ERROR_CODES.includes(
        candidate as (typeof SAFE_POSTGRES_ERROR_CODES)[number],
      ),
    );
  const messageCode = SAFE_POSTGRES_ERROR_CODES.find((candidate) =>
    new RegExp(`\\b${candidate}\\b`, 'i').test(message),
  );
  const signatureCode = SAFE_POSTGRES_ERROR_SIGNATURES.find(({ pattern }) =>
    pattern.test(message),
  )?.code;
  const causeLabel = details.cause
    ? postgresErrorLabel(details.cause, depth + 1)
    : undefined;
  const causeCode = causeLabel?.includes(':')
    ? causeLabel.split(':').at(-1)
    : undefined;
  const code = directCode || messageCode || causeCode || signatureCode;

  return code && code !== 'UNKNOWN' ? `${name}:${code}` : name;
}

function postgresTarget() {
  const value = process.env.DATABASE_URL;
  if (!value) return 'missing DATABASE_URL';

  try {
    const url = new URL(value);
    const database = url.pathname.replace(/^\/+/, '') || '(default)';
    return `${url.hostname}:${url.port || '5432'}/${database}`;
  } catch {
    return 'invalid DATABASE_URL';
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private lastPostgresFailure: string | undefined;

  async onModuleInit(): Promise<void> {
    this.logger.log('PostgreSQL diagnostics: sanitized-v2');
    this.logger.log(`PostgreSQL target: ${postgresTarget()}`);
    try {
      await this.$connect();
      this.logger.log('PostgreSQL initial connection succeeded');
      this.logPostgresRecovery();
    } catch (error) {
      this.logPostgresFailure('initial connection', error);
      void this.logPostgresTcpProbe().catch(() => {
        this.logger.warn('PostgreSQL TCP probe failed (UNKNOWN)');
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      this.logPostgresRecovery();
      return true;
    } catch (error) {
      this.logPostgresFailure('health check', error);
      return false;
    }
  }

  private logPostgresFailure(stage: string, error: unknown) {
    const label = postgresErrorLabel(error);
    const failureKey = `${stage}:${label}`;
    if (this.lastPostgresFailure === failureKey) return;

    this.lastPostgresFailure = failureKey;
    this.logger.warn(`PostgreSQL ${stage} failed (${label})`);
  }

  private async logPostgresTcpProbe(): Promise<void> {
    let host: string;
    let port: number;

    try {
      const url = new URL(process.env.DATABASE_URL ?? '');
      host = url.hostname;
      port = Number(url.port || 5432);
      if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('Invalid PostgreSQL target');
      }
    } catch {
      this.logger.warn('PostgreSQL TCP probe skipped (invalid target)');
      return;
    }

    await new Promise<void>((resolve) => {
      const socket = createConnection({ host, port });
      let settled = false;
      let timeout: NodeJS.Timeout | undefined;
      const finish = (result: string, succeeded: boolean) => {
        if (settled) return;
        settled = true;
        if (timeout) clearTimeout(timeout);
        socket.destroy();
        const message = `PostgreSQL TCP probe ${result}`;
        if (succeeded) this.logger.log(message);
        else this.logger.warn(message);
        resolve();
      };

      timeout = setTimeout(
        () => finish('failed (ETIMEDOUT)', false),
        2500,
      );
      socket.once('connect', () =>
        finish('succeeded (connection accepted)', true),
      );
      socket.once('error', (error: NodeJS.ErrnoException) => {
        const code = safeErrorToken(error.code);
        const safeCode = SAFE_POSTGRES_ERROR_CODES.includes(
          code as (typeof SAFE_POSTGRES_ERROR_CODES)[number],
        )
          ? code
          : 'UNKNOWN';
        finish(`failed (${safeCode})`, false);
      });
    });
  }

  private logPostgresRecovery() {
    if (!this.lastPostgresFailure) return;

    this.lastPostgresFailure = undefined;
    this.logger.log('PostgreSQL connection recovered');
  }
}
