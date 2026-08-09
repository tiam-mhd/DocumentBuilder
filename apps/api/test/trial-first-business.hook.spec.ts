import { SubscriptionStatus as PrismaStatus } from '@prisma/client';
import { PlanCodes, TRIAL_DURATION_DAYS } from '@vdb/shared-types';
import { TrialFirstBusinessHook } from '../src/modules/billing/trial-first-business.hook';

describe('TrialFirstBusinessHook', () => {
  function buildTx(claimedCount: number, corePlanId: string | null = 'plan_1') {
    const subscriptionCreate = jest.fn().mockResolvedValue({});
    const userUpdateMany = jest.fn().mockResolvedValue({ count: claimedCount });
    const planFindUnique = jest.fn().mockResolvedValue(
      corePlanId ? { id: corePlanId, code: PlanCodes.Core } : null,
    );
    const tx = {
      user: { updateMany: userUpdateMany },
      subscription: { create: subscriptionCreate },
      plan: { findUnique: planFindUnique },
    };
    return { tx, subscriptionCreate, userUpdateMany, planFindUnique };
  }

  it(`grants ${TRIAL_DURATION_DAYS}-day trial on Core plan`, async () => {
    const hook = new TrialFirstBusinessHook();
    const { tx, subscriptionCreate, userUpdateMany } = buildTx(1);

    await hook.afterBusinessCreated(tx, {
      userId: 'user_1',
      businessId: 'biz_1',
      isFirstOwnedBusiness: true,
    });

    expect(userUpdateMany).toHaveBeenCalled();
    expect(subscriptionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        businessId: 'biz_1',
        planId: 'plan_1',
        status: PrismaStatus.trial,
        endsAt: expect.any(Date),
      }),
    });
  });

  it('creates pending_payment when trial already consumed', async () => {
    const hook = new TrialFirstBusinessHook();
    const { tx, subscriptionCreate } = buildTx(0);

    await hook.afterBusinessCreated(tx, {
      userId: 'user_1',
      businessId: 'biz_2',
      isFirstOwnedBusiness: false,
    });

    expect(subscriptionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        businessId: 'biz_2',
        planId: 'plan_1',
        status: PrismaStatus.pending_payment,
        endsAt: null,
      }),
    });
  });
});
