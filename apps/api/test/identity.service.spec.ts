import { normalizeMobile } from '../src/modules/identity/mobile.util';
import { generateOtpCode, hashOtp, otpHashesEqual } from '../src/modules/identity/otp.crypto';
import { IdentityService } from '../src/modules/identity/identity.service';
import { AuthErrorCodes } from '@vdb/shared-types';
import { DomainException } from '../src/common/errors/domain.exception';

describe('mobile.util', () => {
  it('normalizes Iranian formats to E.164', () => {
    expect(normalizeMobile('09121234567')).toBe('+989121234567');
    expect(normalizeMobile('+989121234567')).toBe('+989121234567');
    expect(normalizeMobile('989121234567')).toBe('+989121234567');
    expect(normalizeMobile('9121234567')).toBe('+989121234567');
  });

  it('rejects invalid mobiles', () => {
    expect(normalizeMobile('123')).toBeNull();
    expect(normalizeMobile('08121234567')).toBeNull();
  });
});

describe('otp.crypto', () => {
  it('hashes deterministically and compares safely', () => {
    const code = '123456';
    const hash = hashOtp(code, 'pepper');
    expect(otpHashesEqual(hash, hashOtp(code, 'pepper'))).toBe(true);
    expect(otpHashesEqual(hash, hashOtp('000000', 'pepper'))).toBe(false);
  });

  it('generates 6-digit codes', () => {
    expect(generateOtpCode(6)).toMatch(/^\d{6}$/);
  });
});

describe('IdentityService', () => {
  const mobile = '+989121234567';
  const pepper = 'test-pepper';

  function buildService(overrides?: {
    assertCanRequest?: () => Promise<void>;
    getChallenge?: () => Promise<{ hash: string; attempts: number } | null>;
    findUnique?: () => Promise<null | {
      id: string;
      mobile: string;
      trialConsumed: boolean;
      createdAt: Date;
    }>;
  }) {
    const challenges = {
      assertCanRequest:
        overrides?.assertCanRequest ?? jest.fn().mockResolvedValue(undefined),
      saveChallenge: jest.fn().mockResolvedValue(undefined),
      getChallenge:
        overrides?.getChallenge ?? jest.fn().mockResolvedValue(null),
      recordFailedAttempt: jest.fn().mockResolvedValue(undefined),
      consumeChallenge: jest.fn().mockResolvedValue(undefined),
    };
    const prisma = {
      user: {
        findUnique:
          overrides?.findUnique ?? jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async ({ data }: { data: { mobile: string } }) => ({
          id: 'user_1',
          mobile: data.mobile,
          trialConsumed: false,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        })),
      },
    };
    const config = {
      getOrThrow: (key: string) => {
        const map: Record<string, string | number> = {
          OTP_PEPPER: pepper,
          OTP_TTL_SECONDS: 300,
          OTP_COOLDOWN_SECONDS: 60,
          NODE_ENV: 'test',
          SMS_PROVIDER: 'fake',
        };
        return map[key];
      },
      get: (key: string) => {
        if (key === 'NODE_ENV') return 'test';
        if (key === 'SMS_PROVIDER') return 'fake';
        return undefined;
      },
    };
    const sms = { sendOtp: jest.fn().mockResolvedValue(undefined) };
    const tokens = {
      issueAccessToken: jest.fn().mockResolvedValue({
        accessToken: 'test.jwt.token',
        tokenType: 'Bearer',
        expiresInSeconds: 3600,
      }),
    };

    return {
      service: new IdentityService(
        prisma as never,
        challenges as never,
        config as never,
        sms,
        tokens as never,
      ),
      challenges,
      prisma,
      sms,
      tokens,
    };
  }

  it('requests OTP and stores hashed challenge (no raw code in result outside fake+dev)', async () => {
    const { service, challenges, sms } = buildService();
    const result = await service.requestOtp('09121234567');
    expect(result.mobile).toBe(mobile);
    expect(result.devCode).toBeUndefined();
    expect(challenges.saveChallenge).toHaveBeenCalled();
    const savedHash = (challenges.saveChallenge as jest.Mock).mock.calls[0][1];
    expect(savedHash).not.toMatch(/^\d{6}$/);
    expect(sms.sendOtp).toHaveBeenCalledWith(mobile, expect.stringMatching(/^\d{6}$/));
  });

  it('enforces cooldown/rate via store', async () => {
    const { service } = buildService({
      assertCanRequest: jest.fn().mockRejectedValue(
        new DomainException(AuthErrorCodes.OtpCooldown, 'wait', 429),
      ),
    });
    await expect(service.requestOtp('09121234567')).rejects.toMatchObject({
      code: AuthErrorCodes.OtpCooldown,
    });
  });

  it('verifies OTP and creates user', async () => {
    const code = '654321';
    const { service, challenges, prisma, tokens } = buildService({
      getChallenge: jest.fn().mockResolvedValue({
        hash: hashOtp(code, pepper),
        attempts: 0,
      }),
    });
    const result = await service.verifyOtp('09121234567', code);
    expect(result.isNewUser).toBe(true);
    expect(result.user.mobile).toBe(mobile);
    expect(result.accessToken).toBe('test.jwt.token');
    expect(tokens.issueAccessToken).toHaveBeenCalled();
    expect(challenges.consumeChallenge).toHaveBeenCalledWith(mobile);
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('rejects invalid OTP', async () => {
    const { service, challenges } = buildService({
      getChallenge: jest.fn().mockResolvedValue({
        hash: hashOtp('111111', pepper),
        attempts: 0,
      }),
    });
    await expect(service.verifyOtp('09121234567', '222222')).rejects.toMatchObject({
      code: AuthErrorCodes.OtpInvalid,
    });
    expect(challenges.recordFailedAttempt).toHaveBeenCalled();
  });
});
