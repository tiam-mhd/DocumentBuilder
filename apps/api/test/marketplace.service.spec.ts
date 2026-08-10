import { AppEdition, MarketplaceErrorCodes } from '@vdb/shared-types';
import { MarketplaceService } from '../src/modules/marketplace/marketplace.service';

describe('MarketplaceService (P04-T07)', () => {
  function build(edition: AppEdition) {
    const editionSvc = {
      isSaas: jest.fn().mockReturnValue(edition === AppEdition.Saas),
    };
    const entitlements = {
      getForBusiness: jest.fn().mockResolvedValue({
        codes: ['marketplace.templates', 'export.pdf'],
      }),
    };
    const prisma = {
      marketplaceTemplate: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      documentTemplate: {
        create: jest.fn(),
        delete: jest.fn(),
      },
    };
    const bodies = { upsert: jest.fn() };
    const service = new MarketplaceService(
      prisma as never,
      editionSvc as never,
      entitlements as never,
      bodies as never,
    );
    return { service, prisma };
  }

  it('SELF_HOSTED rejects marketplace', () => {
    const { service } = build(AppEdition.SelfHosted);
    try {
      service.assertSaasEdition();
      throw new Error('expected DomainException');
    } catch (e) {
      expect(e).toMatchObject({ code: MarketplaceErrorCodes.EditionRequired });
    }
  });

  it('SAAS list returns empty catalog', async () => {
    const { service } = build(AppEdition.Saas);
    const data = await service.list({ page: 1, pageSize: 10 });
    expect(data.items).toEqual([]);
    expect(data.total).toBe(0);
  });

  it('install 404 when listing missing', async () => {
    const { service } = build(AppEdition.Saas);
    await expect(
      service.install({
        businessId: 'biz',
        marketplaceTemplateId: 'missing',
      }),
    ).rejects.toMatchObject({ code: MarketplaceErrorCodes.NotFound });
  });
});
