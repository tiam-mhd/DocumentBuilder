import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthErrorCodes,
  type AuthTokens,
  type PublicUser,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import { normalizeMobile } from './mobile.util';
import { generateOtpCode, hashOtp, otpHashesEqual } from './otp.crypto';
import { OtpChallengeStore } from './otp-challenge.store';
import { SMS_SENDER, type SmsSender } from './sms/sms-sender';
import { AuthTokenService } from './auth-token.service';

export type RequestOtpResult = {
  mobile: string;
  expiresInSeconds: number;
  cooldownSeconds: number;
  /** Only when SMS_PROVIDER=fake and NODE_ENV=development — never log. */
  devCode?: string;
};

export type VerifyOtpResult = {
  user: PublicUser;
  isNewUser: boolean;
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
};

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly challenges: OtpChallengeStore,
    private readonly config: ConfigService,
    @Inject(SMS_SENDER) private readonly sms: SmsSender,
    private readonly tokens: AuthTokenService,
  ) {}

  async requestOtp(rawMobile: string): Promise<RequestOtpResult> {
    const mobile = this.requireMobile(rawMobile);
    await this.challenges.assertCanRequest(mobile);

    const code = generateOtpCode(6);
    const pepper = this.config.getOrThrow<string>('OTP_PEPPER');
    const hash = hashOtp(code, pepper);
    await this.challenges.saveChallenge(mobile, hash);
    await this.sms.sendOtp(mobile, code);

    const result: RequestOtpResult = {
      mobile,
      expiresInSeconds: this.config.getOrThrow<number>('OTP_TTL_SECONDS'),
      cooldownSeconds: this.config.getOrThrow<number>('OTP_COOLDOWN_SECONDS'),
    };

    if (
      this.config.get<string>('NODE_ENV') === 'development' &&
      this.config.get<string>('SMS_PROVIDER') === 'fake'
    ) {
      result.devCode = code;
    }

    return result;
  }

  async verifyOtp(rawMobile: string, code: string): Promise<VerifyOtpResult> {
    const mobile = this.requireMobile(rawMobile);
    const challenge = await this.challenges.getChallenge(mobile);
    if (!challenge) {
      throw new DomainException(
        AuthErrorCodes.OtpExpired,
        'OTP expired or not requested',
        HttpStatus.BAD_REQUEST,
      );
    }

    const pepper = this.config.getOrThrow<string>('OTP_PEPPER');
    const hash = hashOtp(code, pepper);
    if (!otpHashesEqual(hash, challenge.hash)) {
      await this.challenges.recordFailedAttempt(mobile, challenge);
      throw new DomainException(
        AuthErrorCodes.OtpInvalid,
        'Invalid OTP code',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.challenges.consumeChallenge(mobile);

    const existing = await this.prisma.user.findUnique({ where: { mobile } });
    const userRow =
      existing ??
      (await this.prisma.user.create({
        data: { mobile },
      }));
    const isNewUser = !existing;
    const user = this.toPublic(userRow);
    const token: AuthTokens = await this.tokens.issueAccessToken(user);

    return {
      user,
      isNewUser,
      accessToken: token.accessToken,
      tokenType: token.tokenType,
      expiresInSeconds: token.expiresInSeconds,
    };
  }

  async getUserById(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new DomainException(
        AuthErrorCodes.AuthInvalid,
        'User not found',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return this.toPublic(user);
  }

  private requireMobile(raw: string): string {
    const mobile = normalizeMobile(raw);
    if (!mobile) {
      throw new DomainException(
        AuthErrorCodes.MobileInvalid,
        'Invalid mobile number',
        HttpStatus.BAD_REQUEST,
      );
    }
    return mobile;
  }

  private toPublic(user: {
    id: string;
    mobile: string;
    trialConsumed: boolean;
    createdAt: Date;
  }): PublicUser {
    return {
      id: user.id,
      mobile: user.mobile,
      trialConsumed: user.trialConsumed,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
