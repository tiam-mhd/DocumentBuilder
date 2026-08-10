import { AppEdition, DunningNoticeKind } from '@vdb/shared-types';
import { DunningService } from '../src/modules/billing/dunning.service';

describe('DunningService (P04-T10)', () => {
  function build(edition: AppEdition) {
    const notices: Array<{ kind: string; periodKey: string }> = [];
    const prisma = {
      subscription: {
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      subscriptionDunningNotice: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          if (
            notices.some(
              (n) => n.kind === data.kind && n.periodKey === data.periodKey,
            )
          ) {
            throw new Error('unique');
          }
          notices.push({ kind: data.kind, periodKey: data.periodKey });
          return data;
        }),
      },
      businessMembership: {
        findMany: jest.fn().mockResolvedValue([
          { user: { mobile: '09120000000' } },
        ]),
      },
    };
    const editionSvc = {
      isSaas: jest.fn().mockReturnValue(edition === AppEdition.Saas),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const config = {
      get: jest.fn().mockReturnValue(3),
    };
    const sms = {
      sendOtp: jest.fn(),
      sendTransactional: jest.fn().mockResolvedValue(undefined),
    };
    const service = new DunningService(
      prisma as never,
      editionSvc as never,
      audit as never,
      config as never,
      sms as never,
    );
    return { service, prisma, audit, sms, notices };
  }

  it('SELF_HOSTED skips tick', async () => {
    const { service, prisma } = build(AppEdition.SelfHosted);
    const result = await service.runTick(new Date('2026-08-10T00:00:00.000Z'));
    expect(result.skippedEdition).toBe(true);
    expect(prisma.subscription.findMany).not.toHaveBeenCalled();
  });

  it('transitions active→grace and sends SMS with fake clock', async () => {
    const { service, prisma, audit, sms } = build(AppEdition.Saas);
    const endsAt = new Date('2026-08-01T00:00:00.000Z');
    prisma.subscription.findMany.mockResolvedValue([
      {
        id: 'sub1',
        businessId: 'biz1',
        status: 'active',
        endsAt,
        business: { id: 'biz1', name: 'Acme' },
      },
    ]);
    const now = new Date('2026-08-02T12:00:00.000Z');
    const result = await service.runTick(now);
    expect(result.transitionedGrace).toBe(1);
    expect(result.noticesSent).toBe(1);
    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'grace' },
      }),
    );
    expect(sms.sendTransactional).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'billing.subscription.grace' }),
    );
  });

  it('transitions grace→expired after grace window', async () => {
    const { service, prisma } = build(AppEdition.Saas);
    const endsAt = new Date('2026-08-01T00:00:00.000Z');
    prisma.subscription.findMany.mockResolvedValue([
      {
        id: 'sub1',
        businessId: 'biz1',
        status: 'grace',
        endsAt,
        business: { id: 'biz1', name: 'Acme' },
      },
    ]);
    const now = new Date('2026-08-05T00:00:00.000Z');
    const result = await service.runTick(now);
    expect(result.transitionedExpired).toBe(1);
    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'expired' },
      }),
    );
  });

  it('sends 7-day reminder once (idempotent)', async () => {
    const { service, prisma, sms, notices } = build(AppEdition.Saas);
    const endsAt = new Date('2026-08-17T00:00:00.000Z');
    prisma.subscription.findMany.mockResolvedValue([
      {
        id: 'sub1',
        businessId: 'biz1',
        status: 'active',
        endsAt,
        business: { id: 'biz1', name: 'Acme' },
      },
    ]);
    const now = new Date('2026-08-10T00:00:00.000Z');
    const first = await service.runTick(now);
    const second = await service.runTick(now);
    expect(first.noticesSent).toBe(1);
    expect(second.noticesSent).toBe(0);
    expect(notices.some((n) => n.kind === DunningNoticeKind.Reminder7d)).toBe(
      true,
    );
    expect(sms.sendTransactional).toHaveBeenCalledTimes(1);
  });
});
