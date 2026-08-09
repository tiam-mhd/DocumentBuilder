import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthErrorCodes } from '@vdb/shared-types';
import { DomainException } from '../../../common/errors/domain.exception';
import type { AccessTokenPayload, RequestUser } from '../auth.types';
import { AuthTokenService } from '../auth-token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly tokens: AuthTokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<RequestUser> {
    if (!payload?.sub || !payload?.jti || !payload?.mobile) {
      throw new DomainException(
        AuthErrorCodes.AuthInvalid,
        'Invalid access token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const ok = await this.tokens.assertNotRevoked(payload.jti);
    if (!ok) {
      throw new DomainException(
        AuthErrorCodes.AuthInvalid,
        'Token has been revoked',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return {
      userId: payload.sub,
      mobile: payload.mobile,
      jti: payload.jti,
    };
  }
}
