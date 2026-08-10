import { SubscriptionStatus as PrismaStatus } from '@prisma/client';
import {
  resolveSubscriptionEffectiveStatus,
  SubscriptionStatus,
} from '@vdb/shared-types';
import { SubscriptionService } from '../src/modules/billing/subscription.service';

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
      business: {
        findFirst: jest.fn().mockResolvedValue({ suspendedAt: null }),
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

  it('treats far-past endsAt trial as expired effective status', async () => {
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
    expect(sub.graceEndsAt).toBeTruthy();
  });

  it('treats recent past endsAt as grace (writable)', async () => {
    const endsAt = new Date(Date.now() - 60_000);
    const { service } = build({
      id: 's1',
      businessId: 'b1',
      planId: 'p1',
      planCode: 'plan.core',
      status: PrismaStatus.active,
      startsAt: new Date(Date.now() - 30 * 86_400_000),
      endsAt,
    });
    const sub = await service.getForBusiness('b1');
    expect(sub.effectiveStatus).toBe(SubscriptionStatus.Grace);
    expect(sub.writable).toBe(true);
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

describe('resolveSubscriptionEffectiveStatus (shared)', () => {
  it('keeps active before endsAt', () => {
    const now = new Date('2026-08-01T12:00:00.000Z');
    expect(
      resolveSubscriptionEffectiveStatus(
        'active',
        new Date('2026-08-10T00:00:00.000Z'),
        now,
        3,
      ),
    ).toBe(SubscriptionStatus.Active);
  });

  it('enters grace after endsAt within grace days', () => {
    const now = new Date('2026-08-02T12:00:00.000Z');
    expect(
      resolveSubscriptionEffectiveStatus(
        'active',
        new Date('2026-08-01T00:00:00.000Z'),
        now,
        3,
      ),
    ).toBe(SubscriptionStatus.Grace);
  });

  it('expires after grace window', () => {
    const now = new Date('2026-08-05T12:00:00.000Z');
    expect(
      resolveSubscriptionEffectiveStatus(
        'grace',
        new Date('2026-08-01T00:00:00.000Z'),
        now,
        3,
      ),
    ).toBe(SubscriptionStatus.Expired);
  });
});
