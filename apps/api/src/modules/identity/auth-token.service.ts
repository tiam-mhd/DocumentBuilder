import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import type { AuthTokens, PublicUser } from '@vdb/shared-types';
import type { AccessTokenPayload } from './auth.types';
import { TokenBlacklistStore } from './token-blacklist.store';

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly blacklist: TokenBlacklistStore,
  ) {}

  async issueAccessToken(user: PublicUser): Promise<AuthTokens> {
    const expiresInSeconds = this.config.getOrThrow<number>('JWT_EXPIRES_SECONDS');
    const jti = randomUUID();
    const payload: AccessTokenPayload = {
      sub: user.id,
      mobile: user.mobile,
      jti,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: expiresInSeconds,
    });
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresInSeconds,
    };
  }

  async logout(jti: string, expUnixSeconds?: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const ttl =
      typeof expUnixSeconds === 'number'
        ? Math.max(expUnixSeconds - now, 1)
        : this.config.getOrThrow<number>('JWT_EXPIRES_SECONDS');
    await this.blacklist.revoke(jti, ttl);
  }

  async assertNotRevoked(jti: string): Promise<boolean> {
    return !(await this.blacklist.isRevoked(jti));
  }
}
