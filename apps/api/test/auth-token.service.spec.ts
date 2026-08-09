import { AuthTokenService } from '../src/modules/identity/auth-token.service';

describe('AuthTokenService', () => {
  it('issues access token with Bearer type', async () => {
    const jwt = {
      signAsync: jest.fn().mockResolvedValue('signed.jwt'),
    };
    const config = {
      getOrThrow: (key: string) => {
        if (key === 'JWT_EXPIRES_SECONDS') return 3600;
        throw new Error(key);
      },
    };
    const blacklist = {
      revoke: jest.fn(),
      isRevoked: jest.fn().mockResolvedValue(false),
    };

    const service = new AuthTokenService(
      jwt as never,
      config as never,
      blacklist as never,
    );

    const tokens = await service.issueAccessToken({
      id: 'u1',
      mobile: '+989121234567',
      trialConsumed: false,
      createdAt: new Date().toISOString(),
    });

    expect(tokens.accessToken).toBe('signed.jwt');
    expect(tokens.tokenType).toBe('Bearer');
    expect(tokens.expiresInSeconds).toBe(3600);
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'u1',
        mobile: '+989121234567',
        jti: expect.any(String),
      }),
      { expiresIn: 3600 },
    );
  });

  it('revokes jti on logout', async () => {
    const jwt = { signAsync: jest.fn() };
    const config = {
      getOrThrow: () => 3600,
    };
    const blacklist = {
      revoke: jest.fn().mockResolvedValue(undefined),
      isRevoked: jest.fn(),
    };
    const service = new AuthTokenService(
      jwt as never,
      config as never,
      blacklist as never,
    );

    await service.logout('jti-1', Math.floor(Date.now() / 1000) + 100);
    expect(blacklist.revoke).toHaveBeenCalledWith('jti-1', expect.any(Number));
  });
});
