import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentErrorCodes } from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { RedisService } from '../../config/redis/redis.service';

/** Redis rate-limit + unlock sessions for share-link passwords (ADR 027). */
@Injectable()
export class ShareLinkRateStore {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  private attemptKey(tokenHash: string): string {
    return `share:pw:${tokenHash}`;
  }

  private sessionKey(tokenHash: string): string {
    return `share:session:${tokenHash}`;
  }

  async assertCanAttempt(tokenHash: string): Promise<void> {
    const client = await this.connect();
    const max = this.config.getOrThrow<number>(
      'SHARE_LINK_PASSWORD_MAX_ATTEMPTS',
    );
    const raw = await client.get(this.attemptKey(tokenHash));
    const count = raw ? Number(raw) : 0;
    if (count >= max) {
      throw new DomainException(
        DocumentErrorCodes.ShareRateLimited,
        'Too many password attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async recordFailedAttempt(tokenHash: string): Promise<void> {
    const client = await this.connect();
    const window = this.config.getOrThrow<number>(
      'SHARE_LINK_PASSWORD_WINDOW_SECONDS',
    );
    const key = this.attemptKey(tokenHash);
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, window);
    }
  }

  async clearAttempts(tokenHash: string): Promise<void> {
    const client = await this.connect();
    await client.del(this.attemptKey(tokenHash));
  }

  async grantSession(tokenHash: string): Promise<void> {
    const client = await this.connect();
    const ttl = this.config.getOrThrow<number>('SHARE_LINK_SESSION_SECONDS');
    await client.set(this.sessionKey(tokenHash), '1', 'EX', ttl);
  }

  async hasSession(tokenHash: string): Promise<boolean> {
    const client = await this.connect();
    const v = await client.get(this.sessionKey(tokenHash));
    return v === '1';
  }

  private async connect() {
    try {
      return await this.redis.ensureConnected();
    } catch {
      throw new DomainException(
        DocumentErrorCodes.ShareRateLimited,
        'Share link store unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
