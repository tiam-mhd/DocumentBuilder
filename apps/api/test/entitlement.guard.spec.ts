import { EntitlementCodes, EntitlementErrorCodes, LicenseErrorCodes } from '@vdb/shared-types';
import { DomainException } from '../src/common/errors/domain.exception';
import { EntitlementGuard } from '../src/modules/billing/guards/entitlement.guard';
import { ENTITLEMENT_META_KEY } from '../src/modules/billing/decorators/require-entitlement.decorator';

describe('EntitlementGuard', () => {
  function createContext() {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userId: 'user_1' },
          params: { businessId: 'biz_1' },
        }),
      }),
    };
  }

  it('allows when no entitlement metadata', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };
    const guard = new EntitlementGuard(
      reflector as never,
      { assertMembership: jest.fn() } as never,
      {} as never,
      { requiresInstallationLicense: () => false } as never,
    );
    await expect(
      guard.canActivate(createContext() as never),
    ).resolves.toBe(true);
  });

  it('checks membership + writable on SAAS (no install license)', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({ requireWritable: true }),
    };
    const tenancy = { assertMembership: jest.fn().mockResolvedValue({}) };
    const entitlements = {
      assertBusinessWritable: jest.fn().mockResolvedValue({}),
      assertCan: jest.fn(),
    };
    const billing = {
      requiresInstallationLicense: () => false,
      assertInstallationLicensed: jest.fn(),
    };
    const guard = new EntitlementGuard(
      reflector as never,
      tenancy as never,
      entitlements as never,
      billing as never,
    );

    await expect(
      guard.canActivate(createContext() as never),
    ).resolves.toBe(true);
    expect(tenancy.assertMembership).toHaveBeenCalledWith('user_1', 'biz_1');
    expect(entitlements.assertBusinessWritable).toHaveBeenCalledWith('biz_1');
    expect(billing.assertInstallationLicensed).not.toHaveBeenCalled();
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      ENTITLEMENT_META_KEY,
      expect.any(Array),
    );
  });

  it('SELF_HOSTED denies gated routes without install license', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({ requireWritable: true }),
    };
    const tenancy = { assertMembership: jest.fn().mockResolvedValue({}) };
    const entitlements = {
      assertBusinessWritable: jest.fn(),
      assertCan: jest.fn(),
    };
    const billing = {
      requiresInstallationLicense: () => true,
      assertInstallationLicensed: jest.fn().mockRejectedValue(
        new DomainException(
          LicenseErrorCodes.Required,
          'Installation license required',
          402,
        ),
      ),
    };
    const guard = new EntitlementGuard(
      reflector as never,
      tenancy as never,
      entitlements as never,
      billing as never,
    );

    await expect(
      guard.canActivate(createContext() as never),
    ).rejects.toMatchObject({ code: LicenseErrorCodes.Required });
    expect(entitlements.assertBusinessWritable).not.toHaveBeenCalled();
  });

  it('asserts entitlement codes and surfaces deny', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({
        requireWritable: true,
        requireAll: [EntitlementCodes.ModuleMap],
      }),
    };
    const tenancy = { assertMembership: jest.fn().mockResolvedValue({}) };
    const entitlements = {
      assertBusinessWritable: jest.fn(),
      assertCan: jest.fn().mockRejectedValue(
        new DomainException(
          EntitlementErrorCodes.ModuleRequired,
          'Missing entitlement: module.map',
          403,
        ),
      ),
    };
    const billing = {
      requiresInstallationLicense: () => false,
      assertInstallationLicensed: jest.fn(),
    };
    const guard = new EntitlementGuard(
      reflector as never,
      tenancy as never,
      entitlements as never,
      billing as never,
    );

    await expect(
      guard.canActivate(createContext() as never),
    ).rejects.toMatchObject({
      code: EntitlementErrorCodes.ModuleRequired,
    });
  });
});
