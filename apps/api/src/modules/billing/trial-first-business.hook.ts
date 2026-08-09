import { Injectable } from '@nestjs/common';
import {
  SubscriptionStatus as PrismaSubscriptionStatus,
  type Prisma,
} from '@prisma/client';
import {
  BUSINESS_CREATED_HOOK,
  type BusinessCreatedContext,
  type BusinessCreatedHook,
} from '../tenancy/business-created.hook';
import { PlanCodes, TRIAL_DURATION_DAYS } from '@vdb/shared-types';

/**
 * Inside the Business-create transaction:
 * - claim user.trial_consumed atomically → trial + endsAt (+7d)
 * - else → pending_payment
 * - attach plan.core when catalog is seeded
 */
@Injectable()
export class TrialFirstBusinessHook implements BusinessCreatedHook {
  async afterBusinessCreated(
    tx: unknown,
    context: BusinessCreatedContext,
  ): Promise<void> {
    const client = tx as Prisma.TransactionClient;
    const now = new Date();
    const corePlan = await client.plan.findUnique({
      where: { code: PlanCodes.Core },
    });

    const claimed = await client.user.updateMany({
      where: { id: context.userId, trialConsumed: false },
      data: { trialConsumed: true },
    });

    if (claimed.count === 1) {
      const endsAt = new Date(now);
      endsAt.setUTCDate(endsAt.getUTCDate() + TRIAL_DURATION_DAYS);
      await client.subscription.create({
        data: {
          businessId: context.businessId,
          planId: corePlan?.id,
          status: PrismaSubscriptionStatus.trial,
          startsAt: now,
          endsAt,
        },
      });
      return;
    }

    await client.subscription.create({
      data: {
        businessId: context.businessId,
        planId: corePlan?.id,
        status: PrismaSubscriptionStatus.pending_payment,
        startsAt: now,
        endsAt: null,
      },
    });
  }
}

export { BUSINESS_CREATED_HOOK };
