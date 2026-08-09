import { Injectable } from '@nestjs/common';
import { RedisService } from '../../config/redis/redis.service';

@Injectable()
export class TokenBlacklistStore {
  constructor(private readonly redis: RedisService) {}

  private key(jti: string): string {
    return `auth:blacklist:${jti}`;
  }

  async revoke(jti: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return;
    const client = await this.redis.ensureConnected();
    await client.set(this.key(jti), '1', 'EX', ttlSeconds);
  }

  async isRevoked(jti: string): Promise<boolean> {
    try {
      const client = await this.redis.ensureConnected();
      const value = await client.get(this.key(jti));
      return value === '1';
    } catch {
      // Fail open if Redis is briefly unavailable (logout may have failed too).
      return false;
    }
  }
}
