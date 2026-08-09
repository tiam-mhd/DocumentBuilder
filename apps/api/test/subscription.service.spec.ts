import { SubscriptionStatus as PrismaStatus } from '@prisma/client';
import { SubscriptionService } from '../src/modules/billing/subscription.service';
import { SubscriptionStatus } from '@vdb/shared-types';

describe('SubscriptionService', () => {
  function build(row: {
    id: string;
    businessId: string;
    planId: string | null;
    status: PrismaStatus;
    startsAt: Date;
    endsAt: Date | null;
    planCode?: string | null;
  }) {
    const prisma = {
      subscription: {
        findUnique: jest.fn().mockResolvedValue({
          ...row,
          createdAt: new Date(),
          updatedAt: new Date(),
          plan: row.planCode ? { code: row.planCode } : null,
        }),
      },
    };
    return {
      service: new SubscriptionService(prisma as never),
      prisma,
    };
  }

  it('maps pending_payment as not writable', async () => {
    const { service } = build({
      id: 's1',
      businessId: 'b1',
      planId: 'p1',
      planCode: 'plan.core',
      status: PrismaStatus.pending_payment,
      startsAt: new Date(),
      endsAt: null,
    });
    const sub = await service.getForBusiness('b1');
    expect(sub.status).toBe(SubscriptionStatus.PendingPayment);
    expect(sub.planCode).toBe('plan.core');
    expect(sub.writable).toBe(false);
  });

  it('treats past endsAt trial as expired effective status', async () => {
    const { service } = build({
      id: 's1',
      businessId: 'b1',
      planId: null,
      status: PrismaStatus.trial,
      startsAt: new Date('2020-01-01'),
      endsAt: new Date('2020-01-08'),
    });
    const sub = await service.getForBusiness('b1');
    expect(sub.effectiveStatus).toBe(SubscriptionStatus.Expired);
    expect(sub.writable).toBe(false);
  });

  it('assertBusinessWritable allows active', async () => {
    const { service } = build({
      id: 's1',
      businessId: 'b1',
      planId: 'p1',
      planCode: 'plan.core',
      status: PrismaStatus.active,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 86_400_000),
    });
    await expect(service.assertBusinessWritable('b1')).resolves.toMatchObject({
      writable: true,
    });
  });

  it('assertBusinessWritable rejects pending_payment', async () => {
    const { service } = build({
      id: 's1',
      businessId: 'b1',
      planId: null,
      status: PrismaStatus.pending_payment,
      startsAt: new Date(),
      endsAt: null,
    });
    await expect(service.assertBusinessWritable('b1')).rejects.toMatchObject({
      code: 'SUBSCRIPTION_NOT_WRITABLE',
    });
  });
});
