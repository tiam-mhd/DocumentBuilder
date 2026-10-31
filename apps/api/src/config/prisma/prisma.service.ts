import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

type PrismaErrorDetails = {
  name?: unknown;
  code?: unknown;
  errorCode?: unknown;
  meta?: unknown;
};

function safeErrorToken(value: unknown) {
  return typeof value === 'string'
    ? value.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 48)
    : '';
}

function postgresErrorLabel(error: unknown) {
  if (!error || typeof error !== 'object') return 'UNKNOWN';

  const details = error as PrismaErrorDetails;
  const meta =
    details.meta && typeof details.meta === 'object'
      ? (details.meta as { code?: unknown })
      : undefined;
  const name = safeErrorToken(details.name) || 'Error';
  const code = [details.errorCode, details.code, meta?.code]
    .map(safeErrorToken)
    .find(Boolean);

  return code ? `${name}:${code}` : name;
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
    this.logger.log(`PostgreSQL target: ${postgresTarget()}`);
    try {
      await this.$connect();
      this.logger.log('PostgreSQL initial connection succeeded');
      this.logPostgresRecovery();
    } catch (error) {
      this.logPostgresFailure('initial connection', error);
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
    if (this.lastPostgresFailure === label) return;

    this.lastPostgresFailure = label;
    this.logger.warn(`PostgreSQL ${stage} failed (${label})`);
  }

  private logPostgresRecovery() {
    if (!this.lastPostgresFailure) return;

    this.lastPostgresFailure = undefined;
    this.logger.log('PostgreSQL connection recovered');
  }
}
