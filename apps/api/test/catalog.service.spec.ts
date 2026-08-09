import { CatalogService } from '../src/modules/billing/catalog.service';
import { EntitlementCodes, PlanCodes } from '@vdb/shared-types';

describe('CatalogService', () => {
  it('returns plans and modules from prisma', async () => {
    const prisma = {
      plan: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            code: PlanCodes.Core,
            nameKey: 'plans.core.name',
            descriptionKey: 'plans.core.description',
            priceMonthly: 990000,
            currency: 'IRR',
            baseEntitlements: [EntitlementCodes.ExportPdf],
            planModules: [],
          },
        ]),
      },
      catalogModule: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'm1',
            code: EntitlementCodes.ModuleMap,
            nameKey: 'modules.map.name',
            descriptionKey: 'modules.map.description',
            priceMonthly: 290000,
            currency: 'IRR',
          },
        ]),
      },
    };

    const service = new CatalogService(prisma as never);
    const catalog = await service.getCatalog();
    expect(catalog.plans[0]?.code).toBe(PlanCodes.Core);
    expect(catalog.plans[0]?.baseEntitlements).toContain(
      EntitlementCodes.ExportPdf,
    );
    expect(catalog.modules[0]?.code).toBe(EntitlementCodes.ModuleMap);
  });
});
