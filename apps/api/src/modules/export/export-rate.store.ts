import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExportErrorCodes } from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import type { AppEnv } from '../../config/env.validation';
import { RedisService } from '../../config/redis/redis.service';

/** Redis rate-limit for PDF export enqueue (ADR 033). */
@Injectable()
export class ExportRateStore {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  private rateKey(businessId: string): string {
    return `export:rate:${businessId}`;
  }

  async assertCanEnqueue(businessId: string): Promise<void> {
    const client = await this.connect();
    const max = this.config.get('EXPORT_RATE_MAX', { infer: true });
    const window = this.config.get('EXPORT_RATE_WINDOW_SECONDS', {
      infer: true,
    });
    const key = this.rateKey(businessId);
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, Math.max(1, window));
    }
    if (count > max) {
      throw new DomainException(
        ExportErrorCodes.RateLimited,
        'Too many export requests; try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async connect() {
    try {
      return await this.redis.ensureConnected();
    } catch {
      throw new DomainException(
        ExportErrorCodes.QueueUnavailable,
        'Export rate store unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
