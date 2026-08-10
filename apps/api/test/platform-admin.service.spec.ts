import { AppEdition, PlatformAdminErrorCodes } from '@vdb/shared-types';
import { clientIpFromRequest } from '../src/modules/platform-admin/guards/platform-admin.guard';
import { PlatformAdminService } from '../src/modules/platform-admin/platform-admin.service';

describe('PlatformAdminService (P04-T09)', () => {
  function build(edition: AppEdition) {
    const editionSvc = {
      isSaas: jest.fn().mockReturnValue(edition === AppEdition.Saas),
      getEdition: jest.fn().mockReturnValue(edition),
    };
    const prisma = {
      platformAdmin: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
      user: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      business: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      businessMembership: { count: jest.fn().mockResolvedValue(1) },
      subscription: { findMany: jest.fn(), count: jest.fn() },
      exportJob: { findMany: jest.fn(), count: jest.fn() },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const subscriptions = {
      resolveEffectiveStatus: jest.fn((s: string) => s),
    };
    const config = {
      get: jest.fn().mockReturnValue(''),
    };
    const service = new PlatformAdminService(
      prisma as never,
      editionSvc as never,
      audit as never,
      subscriptions as never,
      config as never,
    );
    return { service, prisma, audit, editionSvc };
  }

  it('SELF_HOSTED rejects assertSaasEdition', () => {
    const { service } = build(AppEdition.SelfHosted);
    try {
      service.assertSaasEdition();
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toMatchObject({
        code: PlatformAdminErrorCodes.EditionRequired,
      });
    }
  });

  it('isPlatformAdmin false when not in table', async () => {
    const { service } = build(AppEdition.Saas);
    await expect(service.isPlatformAdmin('u1')).resolves.toBe(false);
  });

  it('suspend writes audit and sets suspendedAt', async () => {
    const { service, prisma, audit } = build(AppEdition.Saas);
    prisma.business.findFirst.mockResolvedValue({
      id: 'b1',
      name: 'Acme',
      suspendedAt: null,
      createdAt: new Date('2026-01-01'),
    });
    prisma.business.update.mockResolvedValue({
      id: 'b1',
      name: 'Acme',
      suspendedAt: new Date('2026-08-10'),
      suspendedReason: 'abuse',
      createdAt: new Date('2026-01-01'),
    });
    const row = await service.suspendBusiness({
      businessId: 'b1',
      actorUserId: 'admin1',
      reason: 'abuse',
    });
    expect(row.suspended).toBe(true);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'platform.business.suspend',
        businessId: 'b1',
      }),
    );
  });

  it('clientIpFromRequest reads X-Forwarded-For first hop', () => {
    expect(
      clientIpFromRequest({
        headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' },
        ip: '127.0.0.1',
      } as never),
    ).toBe('203.0.113.10');
  });
});
