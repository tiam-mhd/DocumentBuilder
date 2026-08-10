import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuditActions,
  AuthErrorCodes,
  type AuthTokens,
  type LoginOptions,
  type PublicUser,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { normalizeMobile } from './mobile.util';
import { generateOtpCode, hashOtp, otpHashesEqual } from './otp.crypto';
import {
  hashPassword,
  isPasswordStrongEnough,
  verifyPassword,
} from './password.crypto';
import { OtpChallengeStore } from './otp-challenge.store';
import { TwoFactorChallengeStore } from './two-factor-challenge.store';
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

export type PasswordLoginResult =
  | VerifyOtpResult
  | {
      requiresOtp: true;
      challengeToken: string;
      mobile: string;
      expiresInSeconds: number;
      cooldownSeconds: number;
      devCode?: string;
    };

type UserRow = {
  id: string;
  mobile: string;
  displayName: string | null;
  email: string | null;
  jobTitle: string | null;
  bio: string | null;
  passwordHash: string | null;
  twoFactorEnabled: boolean;
  trialConsumed: boolean;
  createdAt: Date;
};

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly challenges: OtpChallengeStore,
    private readonly twoFactor: TwoFactorChallengeStore,
    private readonly config: ConfigService,
    @Inject(SMS_SENDER) private readonly sms: SmsSender,
    private readonly tokens: AuthTokenService,
    private readonly audit: AuditService,
  ) {}

  async getLoginOptions(rawMobile: string): Promise<LoginOptions> {
    const mobile = this.requireMobile(rawMobile);
    const user = await this.prisma.user.findUnique({ where: { mobile } });
    const hasPassword = Boolean(user?.passwordHash);
    const twoFactorEnabled = Boolean(user?.twoFactorEnabled);
    const methods: LoginOptions['methods'] = ['otp'];
    if (hasPassword) {
      methods.push('password');
    }
    return { mobile, hasPassword, twoFactorEnabled, methods };
  }

  async requestOtp(rawMobile: string): Promise<RequestOtpResult> {
    const mobile = this.requireMobile(rawMobile);
    await this.challenges.assertCanRequest(mobile);

    const code = generateOtpCode(6);
    const pepper = this.config.getOrThrow<string>('OTP_PEPPER');
    const hash = hashOtp(code, pepper);
    await this.challenges.saveChallenge(mobile, hash);
    await this.sms.sendOtp(mobile, code);

    return this.otpRequestMeta(mobile, code);
  }

  async verifyOtp(rawMobile: string, code: string): Promise<VerifyOtpResult> {
    const mobile = this.requireMobile(rawMobile);
    await this.assertOtpValid(mobile, code);
    await this.challenges.consumeChallenge(mobile);

    const existing = await this.prisma.user.findUnique({ where: { mobile } });
    const userRow =
      existing ??
      (await this.prisma.user.create({
        data: { mobile },
      }));
    return this.issueSession(userRow as UserRow, !existing);
  }

  async loginWithPassword(
    rawMobile: string,
    password: string,
  ): Promise<PasswordLoginResult> {
    const mobile = this.requireMobile(rawMobile);
    const user = await this.prisma.user.findUnique({ where: { mobile } });
    if (!user?.passwordHash) {
      throw new DomainException(
        AuthErrorCodes.PasswordNotSet,
        'Password login is not available for this account',
        HttpStatus.BAD_REQUEST,
      );
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw new DomainException(
        AuthErrorCodes.PasswordInvalid,
        'Invalid mobile or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.twoFactorEnabled) {
      await this.challenges.assertCanRequest(mobile);
      const code = generateOtpCode(6);
      const pepper = this.config.getOrThrow<string>('OTP_PEPPER');
      await this.challenges.saveChallenge(mobile, hashOtp(code, pepper));
      await this.sms.sendOtp(mobile, code);
      const challengeToken = await this.twoFactor.create(user.id, mobile);
      const meta = this.otpRequestMeta(mobile, code);
      return {
        requiresOtp: true,
        challengeToken,
        mobile,
        expiresInSeconds: meta.expiresInSeconds,
        cooldownSeconds: meta.cooldownSeconds,
        ...(meta.devCode ? { devCode: meta.devCode } : {}),
      };
    }

    return this.issueSession(user as UserRow, false);
  }

  async verifyTwoFactor(
    challengeToken: string,
    code: string,
  ): Promise<VerifyOtpResult> {
    const challenge = await this.twoFactor.get(challengeToken);
    if (!challenge) {
      throw new DomainException(
        AuthErrorCodes.TwoFactorChallengeInvalid,
        'Two-factor challenge expired or invalid',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.assertOtpValid(challenge.mobile, code);
    await this.challenges.consumeChallenge(challenge.mobile);
    await this.twoFactor.consume(challengeToken);

    const user = await this.prisma.user.findUnique({
      where: { id: challenge.userId },
    });
    if (!user) {
      throw new DomainException(
        AuthErrorCodes.AuthInvalid,
        'User not found',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return this.issueSession(user as UserRow, false);
  }

  async setPassword(
    userId: string,
    password: string,
    currentPassword?: string,
  ): Promise<PublicUser> {
    if (!isPasswordStrongEnough(password)) {
      throw new DomainException(
        AuthErrorCodes.PasswordTooWeak,
        'Password must be 8–128 chars with a letter and a digit',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.requireUserRow(userId);
    if (user.passwordHash) {
      if (!currentPassword) {
        throw new DomainException(
          AuthErrorCodes.PasswordRequired,
          'Current password is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      const ok = await verifyPassword(currentPassword, user.passwordHash);
      if (!ok) {
        throw new DomainException(
          AuthErrorCodes.PasswordMismatch,
          'Current password is incorrect',
          HttpStatus.UNAUTHORIZED,
        );
      }
    }

    const passwordHash = await hashPassword(password);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return this.toPublic(updated as UserRow);
  }

  async setTwoFactorEnabled(
    userId: string,
    enabled: boolean,
  ): Promise<PublicUser> {
    const user = await this.requireUserRow(userId);
    if (enabled && !user.passwordHash) {
      throw new DomainException(
        AuthErrorCodes.PasswordNotSet,
        'Set a password before enabling two-factor authentication',
        HttpStatus.BAD_REQUEST,
      );
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: enabled },
    });
    return this.toPublic(updated as UserRow);
  }

  async getUserById(id: string): Promise<PublicUser> {
    return this.toPublic(await this.requireUserRow(id));
  }

  async updateProfile(
    userId: string,
    input: {
      displayName?: string | null;
      email?: string | null;
      jobTitle?: string | null;
      bio?: string | null;
    },
  ): Promise<PublicUser> {
    const data: {
      displayName?: string | null;
      email?: string | null;
      jobTitle?: string | null;
      bio?: string | null;
    } = {};

    if (input.displayName !== undefined) {
      const v = input.displayName?.trim() || null;
      if (v && v.length > 120) {
        throw new DomainException(
          AuthErrorCodes.AuthInvalid,
          'Display name too long',
          HttpStatus.BAD_REQUEST,
        );
      }
      data.displayName = v;
    }
    if (input.email !== undefined) {
      const v = input.email?.trim() || null;
      if (v) {
        if (v.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
          throw new DomainException(
            AuthErrorCodes.AuthInvalid,
            'Invalid email',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      data.email = v;
    }
    if (input.jobTitle !== undefined) {
      const v = input.jobTitle?.trim() || null;
      if (v && v.length > 120) {
        throw new DomainException(
          AuthErrorCodes.AuthInvalid,
          'Job title too long',
          HttpStatus.BAD_REQUEST,
        );
      }
      data.jobTitle = v;
    }
    if (input.bio !== undefined) {
      const v = input.bio?.trim() || null;
      if (v && v.length > 1000) {
        throw new DomainException(
          AuthErrorCodes.AuthInvalid,
          'Bio too long',
          HttpStatus.BAD_REQUEST,
        );
      }
      data.bio = v;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return this.toPublic(updated as UserRow);
  }

  private async assertOtpValid(mobile: string, code: string): Promise<void> {
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
  }

  private async issueSession(
    userRow: UserRow,
    isNewUser: boolean,
  ): Promise<VerifyOtpResult> {
    const user = this.toPublic(userRow);
    const token: AuthTokens = await this.tokens.issueAccessToken(user);

    await this.audit.log({
      action: AuditActions.AuthLogin,
      entityType: 'user',
      entityId: user.id,
      businessId: null,
      userId: user.id,
      meta: { isNewUser },
    });

    return {
      user,
      isNewUser,
      accessToken: token.accessToken,
      tokenType: token.tokenType,
      expiresInSeconds: token.expiresInSeconds,
    };
  }

  private otpRequestMeta(mobile: string, code: string): RequestOtpResult {
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

  private async requireUserRow(id: string): Promise<UserRow> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new DomainException(
        AuthErrorCodes.AuthInvalid,
        'User not found',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return user as UserRow;
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

  private toPublic(user: UserRow): PublicUser {
    return {
      id: user.id,
      mobile: user.mobile,
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      jobTitle: user.jobTitle ?? null,
      bio: user.bio ?? null,
      trialConsumed: user.trialConsumed,
      hasPassword: Boolean(user.passwordHash),
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
      createdAt: user.createdAt.toISOString(),
    };
  }
}
