import { HttpStatus, Injectable } from '@nestjs/common';
import {
  SubscriptionStatus as PrismaStatus,
  type Subscription,
} from '@prisma/client';
import {
  daysUntilSubscriptionEnd,
  isSubscriptionWritable,
  PlatformAdminErrorCodes,
  resolveSubscriptionEffectiveStatus,
  subscriptionGraceEndsAt,
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
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      select: { suspendedAt: true },
    });
    return this.toPublic(row, Boolean(business?.suspendedAt));
  }

  /**
   * Prep for EntitlementGuard — membership must be checked by caller/guard first.
   */
  async assertBusinessWritable(businessId: string): Promise<PublicSubscription> {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      select: { suspendedAt: true },
    });
    if (business?.suspendedAt) {
      throw new DomainException(
        PlatformAdminErrorCodes.BusinessSuspended,
        'Business is suspended by platform',
        HttpStatus.FORBIDDEN,
      );
    }
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
    return resolveSubscriptionEffectiveStatus(status, endsAt, now);
  }

  private toPublic(
    row: Subscription & { plan?: { code: string } | null },
    suspended = false,
    now: Date = new Date(),
  ): PublicSubscription {
    const status = row.status as SubscriptionStatus;
    const effectiveStatus = this.resolveEffectiveStatus(status, row.endsAt, now);
    const graceEnd = subscriptionGraceEndsAt(row.endsAt);
    return {
      id: row.id,
      businessId: row.businessId,
      planId: row.planId,
      planCode: row.plan?.code ?? null,
      status,
      effectiveStatus,
      writable: !suspended && isSubscriptionWritable(effectiveStatus),
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt ? row.endsAt.toISOString() : null,
      graceEndsAt: graceEnd ? graceEnd.toISOString() : null,
      daysUntilEnd: daysUntilSubscriptionEnd(row.endsAt, now),
    };
  }
}
