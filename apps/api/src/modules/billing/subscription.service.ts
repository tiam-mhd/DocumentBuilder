import { HttpStatus, Injectable } from '@nestjs/common';
import {
  SubscriptionStatus as PrismaStatus,
  type Subscription,
} from '@prisma/client';
import {
  isSubscriptionWritable,
  SubscriptionStatus,
  type PublicSubscription,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';

export const BillingErrorCodes = {
  SubscriptionNotFound: 'SUBSCRIPTION_NOT_FOUND',
  SubscriptionNotWritable: 'SUBSCRIPTION_NOT_WRITABLE',
} as const;

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async getForBusiness(businessId: string): Promise<PublicSubscription> {
    const row = await this.prisma.subscription.findUnique({
      where: { businessId },
      include: { plan: true },
    });
    if (!row) {
      throw new DomainException(
        BillingErrorCodes.SubscriptionNotFound,
        'Subscription not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return this.toPublic(row);
  }

  /**
   * Prep for EntitlementGuard — membership must be checked by caller/guard first.
   */
  async assertBusinessWritable(businessId: string): Promise<PublicSubscription> {
    const sub = await this.getForBusiness(businessId);
    if (!sub.writable) {
      throw new DomainException(
        BillingErrorCodes.SubscriptionNotWritable,
        `Business subscription is not writable (${sub.effectiveStatus})`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    return sub;
  }

  isWritableStatus(status: SubscriptionStatus | string): boolean {
    return isSubscriptionWritable(status);
  }

  resolveEffectiveStatus(
    status: SubscriptionStatus | PrismaStatus,
    endsAt: Date | null,
    now: Date = new Date(),
  ): SubscriptionStatus {
    const mapped = status as SubscriptionStatus;
    if (
      endsAt &&
      endsAt.getTime() < now.getTime() &&
      (mapped === SubscriptionStatus.Trial ||
        mapped === SubscriptionStatus.Active ||
        mapped === SubscriptionStatus.Grace)
    ) {
      return SubscriptionStatus.Expired;
    }
    return mapped;
  }

  private toPublic(
    row: Subscription & { plan?: { code: string } | null },
  ): PublicSubscription {
    const status = row.status as SubscriptionStatus;
    const effectiveStatus = this.resolveEffectiveStatus(status, row.endsAt);
    return {
      id: row.id,
      businessId: row.businessId,
      planId: row.planId,
      planCode: row.plan?.code ?? null,
      status,
      effectiveStatus,
      writable: isSubscriptionWritable(effectiveStatus),
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    };
  }
}
