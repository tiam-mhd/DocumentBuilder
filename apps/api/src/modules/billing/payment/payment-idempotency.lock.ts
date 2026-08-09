import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../config/redis/redis.service';

const LOCK_TTL_SECONDS = 30;

/**
 * Short-lived Redis lock for webhook/confirm races.
 * Unique gateway_ref in PG remains the durable idempotency key.
 */
@Injectable()
export class PaymentIdempotencyLock {
  constructor(private readonly redis: RedisService) {}

  private key(gatewayRef: string): string {
    return `payment:webhook:${gatewayRef}`;
  }

  async acquire(gatewayRef: string): Promise<boolean> {
    try {
      const client = await this.redis.ensureConnected();
      const result = await client.set(
        this.key(gatewayRef),
        '1',
        'EX',
        LOCK_TTL_SECONDS,
        'NX',
      );
      return result === 'OK';
    } catch {
      // Soft: if Redis down, rely on unique gateway_ref + status check.
      return true;
    }
  }

  async release(gatewayRef: string): Promise<void> {
    try {
      const client = await this.redis.ensureConnected();
      await client.del(this.key(gatewayRef));
    } catch {
      // ignore
    }
  }
}
