import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthErrorCodes } from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { RedisService } from '../../config/redis/redis.service';

type ChallengePayload = {
  hash: string;
  attempts: number;
};

@Injectable()
export class OtpChallengeStore {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  private challengeKey(mobile: string): string {
    return `otp:challenge:${mobile}`;
  }

  private cooldownKey(mobile: string): string {
    return `otp:cooldown:${mobile}`;
  }

  private rateKey(mobile: string): string {
    return `otp:rate:${mobile}`;
  }

  async assertCanRequest(mobile: string): Promise<void> {
    const client = await this.connect();
    const cooldownTtl = await client.ttl(this.cooldownKey(mobile));
    if (cooldownTtl > 0) {
      throw new DomainException(
        AuthErrorCodes.OtpCooldown,
        `Wait ${cooldownTtl}s before requesting another OTP`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const rateMax = this.config.getOrThrow<number>('OTP_RATE_MAX');
    const countRaw = await client.get(this.rateKey(mobile));
    const count = countRaw ? Number(countRaw) : 0;
    if (count >= rateMax) {
      throw new DomainException(
        AuthErrorCodes.OtpRateLimited,
        'Too many OTP requests; try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async saveChallenge(mobile: string, hash: string): Promise<void> {
    const client = await this.connect();
    const ttl = this.config.getOrThrow<number>('OTP_TTL_SECONDS');
    const cooldown = this.config.getOrThrow<number>('OTP_COOLDOWN_SECONDS');
    const rateWindow = this.config.getOrThrow<number>('OTP_RATE_WINDOW_SECONDS');

    const payload: ChallengePayload = { hash, attempts: 0 };
    const pipeline = client.pipeline();
    pipeline.set(this.challengeKey(mobile), JSON.stringify(payload), 'EX', ttl);
    pipeline.set(this.cooldownKey(mobile), '1', 'EX', cooldown);

    const rateKey = this.rateKey(mobile);
    pipeline.incr(rateKey);
    const rateTtl = await client.ttl(rateKey);
    if (rateTtl < 0) {
      pipeline.expire(rateKey, rateWindow);
    }

    await pipeline.exec();
  }

  async getChallenge(mobile: string): Promise<ChallengePayload | null> {
    const client = await this.connect();
    const raw = await client.get(this.challengeKey(mobile));
    if (!raw) return null;
    return JSON.parse(raw) as ChallengePayload;
  }

  async recordFailedAttempt(mobile: string, challenge: ChallengePayload): Promise<void> {
    const client = await this.connect();
    const maxAttempts = this.config.getOrThrow<number>('OTP_MAX_ATTEMPTS');
    const next: ChallengePayload = {
      ...challenge,
      attempts: challenge.attempts + 1,
    };

    if (next.attempts >= maxAttempts) {
      await client.del(this.challengeKey(mobile));
      return;
    }

    const ttl = await client.ttl(this.challengeKey(mobile));
    if (ttl > 0) {
      await client.set(this.challengeKey(mobile), JSON.stringify(next), 'EX', ttl);
    } else {
      await client.del(this.challengeKey(mobile));
    }
  }

  async consumeChallenge(mobile: string): Promise<void> {
    const client = await this.connect();
    await client.del(this.challengeKey(mobile));
  }

  private async connect() {
    try {
      return await this.redis.ensureConnected();
    } catch {
      throw new DomainException(
        AuthErrorCodes.RedisUnavailable,
        'OTP store unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
