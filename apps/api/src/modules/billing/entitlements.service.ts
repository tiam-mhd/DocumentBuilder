import { HttpStatus, Injectable } from '@nestjs/common';
import {
  EntitlementErrorCodes,
  isSubscriptionWritable,
  SubscriptionStatus,
  type PublicBusinessEntitlements,
  type PublicSubscription,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class EntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionService,
  ) {}

  async getForBusiness(businessId: string): Promise<PublicBusinessEntitlements> {
    const row = await this.prisma.subscription.findUnique({
      where: { businessId },
      include: {
        plan: true,
        modules: { include: { module: true } },
      },
    });
    if (!row) {
      throw new DomainException(
        EntitlementErrorCodes.SubscriptionNotFound,
        'Subscription not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      select: { suspendedAt: true },
    });
    const suspended = Boolean(business?.suspendedAt);

    const effectiveStatus = this.subscriptions.resolveEffectiveStatus(
      row.status,
      row.endsAt,
    );
    const writable =
      !suspended && isSubscriptionWritable(effectiveStatus);
    const base = Array.isArray(row.plan?.baseEntitlements)
      ? (row.plan!.baseEntitlements as string[])
      : [];
    const modules = row.modules.map((m) => m.module.code);
    const codes = [...new Set([...base, ...modules])].sort();

    return {
      businessId,
      writable,
      effectiveStatus,
      planCode: row.plan?.code ?? null,
      codes,
      modules: [...modules].sort(),
    };
  }

  async assertBusinessWritable(
    businessId: string,
  ): Promise<PublicSubscription> {
    return this.subscriptions.assertBusinessWritable(businessId);
  }

  async assertCan(businessId: string, code: string): Promise<PublicBusinessEntitlements> {
    const entitlements = await this.getForBusiness(businessId);
    if (!entitlements.writable) {
      throw new DomainException(
        EntitlementErrorCodes.SubscriptionNotWritable,
        `Business subscription is not writable (${entitlements.effectiveStatus})`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    if (!entitlements.codes.includes(code)) {
      const isModule = code.startsWith('module.');
      throw new DomainException(
        isModule
          ? EntitlementErrorCodes.ModuleRequired
          : EntitlementErrorCodes.Denied,
        `Missing entitlement: ${code}`,
        HttpStatus.FORBIDDEN,
      );
    }
    return entitlements;
  }

  async assertModule(
    businessId: string,
    moduleCode: string,
  ): Promise<PublicBusinessEntitlements> {
    return this.assertCan(businessId, moduleCode);
  }

  /** True when status would allow mutate/export (no code check). */
  isWritableStatus(status: SubscriptionStatus | string): boolean {
    return isSubscriptionWritable(status);
  }
}
