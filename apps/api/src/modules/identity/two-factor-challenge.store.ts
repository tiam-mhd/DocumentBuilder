import { randomBytes } from 'crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthErrorCodes } from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { RedisService } from '../../config/redis/redis.service';

type TwoFactorPayload = {
  userId: string;
  mobile: string;
};

@Injectable()
export class TwoFactorChallengeStore {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  private key(token: string): string {
    return `auth:2fa:${token}`;
  }

  async create(userId: string, mobile: string): Promise<string> {
    const client = await this.connect();
    const token = randomBytes(24).toString('hex');
    const ttl = this.config.getOrThrow<number>('OTP_TTL_SECONDS');
    const payload: TwoFactorPayload = { userId, mobile };
    await client.set(this.key(token), JSON.stringify(payload), 'EX', ttl);
    return token;
  }

  async get(token: string): Promise<TwoFactorPayload | null> {
    const client = await this.connect();
    const raw = await client.get(this.key(token));
    if (!raw) return null;
    return JSON.parse(raw) as TwoFactorPayload;
  }

  async consume(token: string): Promise<void> {
    const client = await this.connect();
    await client.del(this.key(token));
  }

  private async connect() {
    try {
      return await this.redis.ensureConnected();
    } catch {
      throw new DomainException(
        AuthErrorCodes.RedisUnavailable,
        'Auth challenge store unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
