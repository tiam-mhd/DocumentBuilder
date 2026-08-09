import { HttpStatus } from '@nestjs/common';
import { EntitlementCodes, EntitlementErrorCodes } from '@vdb/shared-types';
import { DomainException } from '../src/common/errors/domain.exception';
import { EntitlementsService } from '../src/modules/billing/entitlements.service';

describe('EntitlementsService', () => {
  function buildService(row: {
    status: string;
    endsAt: Date | null;
    planCode?: string | null;
    baseEntitlements?: string[];
    modules?: string[];
  }) {
    const prisma = {
      subscription: {
        findUnique: jest.fn().mockResolvedValue({
          businessId: 'biz_1',
          status: row.status,
          endsAt: row.endsAt,
          plan: row.planCode
            ? {
                code: row.planCode,
                baseEntitlements: row.baseEntitlements ?? [
                  EntitlementCodes.ExportPdf,
                ],
              }
            : null,
          modules: (row.modules ?? []).map((code) => ({
            module: { code },
          })),
        }),
      },
    };

    const subscriptions = {
      resolveEffectiveStatus: jest.fn(
        (status: string, endsAt: Date | null) => {
          if (
            endsAt &&
            endsAt.getTime() < Date.now() &&
            (status === 'trial' || status === 'active' || status === 'grace')
          ) {
            return 'expired';
          }
          return status;
        },
      ),
      assertBusinessWritable: jest.fn(),
    };

    const service = new EntitlementsService(
      prisma as never,
      subscriptions as never,
    );

    subscriptions.assertBusinessWritable.mockImplementation(
      async (businessId: string) => {
        const entitlements = await service.getForBusiness(businessId);
        if (!entitlements.writable) {
          throw new DomainException(
            EntitlementErrorCodes.SubscriptionNotWritable,
            'not writable',
            HttpStatus.PAYMENT_REQUIRED,
          );
        }
        return { businessId, writable: true };
      },
    );

    return { service, prisma, subscriptions };
  }

  it('returns plan base + module codes and writable for trial', async () => {
    const { service } = buildService({
      status: 'trial',
      endsAt: new Date(Date.now() + 86400000),
      planCode: 'plan.core',
      modules: [EntitlementCodes.ModuleMap],
    });

    const data = await service.getForBusiness('biz_1');
    expect(data.writable).toBe(true);
    expect(data.codes).toEqual(
      expect.arrayContaining([
        EntitlementCodes.ExportPdf,
        EntitlementCodes.ModuleMap,
      ]),
    );
    expect(data.modules).toEqual([EntitlementCodes.ModuleMap]);
  });

  it('deny assertCan when pending_payment', async () => {
    const { service } = buildService({
      status: 'pending_payment',
      endsAt: null,
      planCode: 'plan.core',
    });

    await expect(
      service.assertCan('biz_1', EntitlementCodes.ExportPdf),
    ).rejects.toMatchObject({
      code: EntitlementErrorCodes.SubscriptionNotWritable,
    });
  });

  it('deny assertCan when expired effective status', async () => {
    const { service } = buildService({
      status: 'active',
      endsAt: new Date(Date.now() - 1000),
      planCode: 'plan.core',
    });

    await expect(
      service.assertCan('biz_1', EntitlementCodes.ExportPdf),
    ).rejects.toMatchObject({
      code: EntitlementErrorCodes.SubscriptionNotWritable,
    });
  });

  it('allow export.pdf on active with plan base entitlement', async () => {
    const { service } = buildService({
      status: 'active',
      endsAt: new Date(Date.now() + 86400000),
      planCode: 'plan.core',
    });

    await expect(
      service.assertCan('biz_1', EntitlementCodes.ExportPdf),
    ).resolves.toMatchObject({ writable: true });
  });

  it('deny locked module with ENTITLEMENT_MODULE_REQUIRED', async () => {
    const { service } = buildService({
      status: 'active',
      endsAt: new Date(Date.now() + 86400000),
      planCode: 'plan.core',
      modules: [],
    });

    await expect(
      service.assertModule('biz_1', EntitlementCodes.ModuleMap),
    ).rejects.toMatchObject({
      code: EntitlementErrorCodes.ModuleRequired,
    });
  });
});
