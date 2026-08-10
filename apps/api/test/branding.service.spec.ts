import { AppEdition, BrandingErrorCodes, EntitlementCodes } from '@vdb/shared-types';
import { BrandingService } from '../src/modules/branding/branding.service';

describe('BrandingService (P04-T03)', () => {
  function build(opts?: {
    edition?: AppEdition;
    entitlementCodes?: string[];
  }) {
    const edition = {
      getEdition: jest
        .fn()
        .mockReturnValue(opts?.edition ?? AppEdition.Saas),
      getPublicConfig: jest.fn().mockReturnValue({
        showPoweredBy: (opts?.edition ?? AppEdition.Saas) === AppEdition.Saas,
      }),
    };
    const entitlements = {
      getForBusiness: jest.fn().mockResolvedValue({
        codes: opts?.entitlementCodes ?? [],
      }),
    };
    const prisma = {
      businessBranding: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async ({ data }) => ({
          ...data,
          displayName: data.displayName ?? null,
          primaryColor: data.primaryColor ?? null,
          customDomain: data.customDomain ?? null,
          hidePoweredBy: data.hidePoweredBy ?? false,
          logoStorageKey: null,
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        })),
        upsert: jest.fn().mockImplementation(async ({ create, update }) => ({
          businessId: create.businessId,
          displayName: update.displayName ?? create.displayName ?? null,
          primaryColor: update.primaryColor ?? create.primaryColor ?? null,
          customDomain: update.customDomain ?? create.customDomain ?? null,
          hidePoweredBy:
            update.hidePoweredBy ?? create.hidePoweredBy ?? false,
          logoStorageKey: null,
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        })),
        update: jest.fn(),
      },
    };
    const storage = { put: jest.fn(), get: jest.fn(), delete: jest.fn() };
    const service = new BrandingService(
      prisma as never,
      edition as never,
      entitlements as never,
      storage as never,
    );
    return { service, prisma, entitlements, edition };
  }

  it('SELF_HOSTED allows customize without entitlement', async () => {
    const { service } = build({ edition: AppEdition.SelfHosted });
    const caps = await service.resolveCapabilities('biz_1');
    expect(caps.canCustomize).toBe(true);
    expect(caps.requiresEntitlement).toBe(false);
  });

  it('SAAS without branding.white_label denies customize', async () => {
    const { service } = build({
      edition: AppEdition.Saas,
      entitlementCodes: [EntitlementCodes.ExportPdf],
    });
    const caps = await service.resolveCapabilities('biz_1');
    expect(caps.canCustomize).toBe(false);
    await expect(
      service.update({ businessId: 'biz_1', displayName: 'Acme' }),
    ).rejects.toMatchObject({ code: BrandingErrorCodes.NotAllowed });
  });

  it('SAAS with entitlement accepts color and hides powered-by', async () => {
    const { service } = build({
      edition: AppEdition.Saas,
      entitlementCodes: [EntitlementCodes.BrandingWhiteLabel],
    });
    const data = await service.update({
      businessId: 'biz_1',
      primaryColor: '#abc',
      hidePoweredBy: true,
      customDomain: 'docs.example.com',
    });
    expect(data.primaryColor).toBe('#ABC');
    expect(data.customDomain).toBe('docs.example.com');
    expect(data.showPoweredByEffective).toBe(false);
  });

  it('rejects invalid color', async () => {
    const { service } = build({
      edition: AppEdition.SelfHosted,
    });
    await expect(
      service.update({ businessId: 'biz_1', primaryColor: 'red' }),
    ).rejects.toMatchObject({ code: BrandingErrorCodes.InvalidColor });
  });
});
