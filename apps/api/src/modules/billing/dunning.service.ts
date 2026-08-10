import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MembershipRole,
  SubscriptionStatus as PrismaSubscriptionStatus,
} from '@prisma/client';
import {
  AuditActions,
  DunningNoticeKind,
  GRACE_DURATION_DAYS,
  resolveSubscriptionEffectiveStatus,
  SubscriptionStatus,
  type DunningNoticeKindValue,
} from '@vdb/shared-types';
import { EditionService } from '../../config/edition/edition.service';
import type { AppEnv } from '../../config/env.validation';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SMS_SENDER, type SmsSender } from '../identity/sms/sms-sender';

export type DunningTickResult = {
  scanned: number;
  transitionedGrace: number;
  transitionedExpired: number;
  noticesSent: number;
  skippedEdition: boolean;
};

@Injectable()
export class DunningService {
  private readonly logger = new Logger(DunningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly edition: EditionService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppEnv, true>,
    @Inject(SMS_SENDER) private readonly sms: SmsSender,
  ) {}

  graceDays(): number {
    const raw = this.config.get('BILLING_GRACE_DAYS', { infer: true });
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : GRACE_DURATION_DAYS;
  }

  /**
   * Daily tick — injectable `now` for tests (fake clock).
   * Never deletes Business/document data.
   */
  async runTick(now: Date = new Date()): Promise<DunningTickResult> {
    if (!this.edition.isSaas()) {
      return {
        scanned: 0,
        transitionedGrace: 0,
        transitionedExpired: 0,
        noticesSent: 0,
        skippedEdition: true,
      };
    }

    const graceDays = this.graceDays();
    const rows = await this.prisma.subscription.findMany({
      where: {
        status: {
          in: [
            PrismaSubscriptionStatus.trial,
            PrismaSubscriptionStatus.active,
            PrismaSubscriptionStatus.grace,
          ],
        },
        endsAt: { not: null },
        business: { deletedAt: null },
      },
      include: {
        business: { select: { id: true, name: true } },
      },
      take: 2000,
    });

    let transitionedGrace = 0;
    let transitionedExpired = 0;
    let noticesSent = 0;

    for (const row of rows) {
      const endsAt = row.endsAt!;
      const periodKey = endsAt.toISOString().slice(0, 10);
      const effective = resolveSubscriptionEffectiveStatus(
        row.status,
        endsAt,
        now,
        graceDays,
      );
      const stored = row.status as SubscriptionStatus;

      if (
        effective === SubscriptionStatus.Grace &&
        stored !== SubscriptionStatus.Grace
      ) {
        await this.prisma.subscription.update({
          where: { id: row.id },
          data: { status: PrismaSubscriptionStatus.grace },
        });
        transitionedGrace += 1;
        await this.audit.log({
          action: AuditActions.BillingSubscriptionGrace,
          entityType: 'subscription',
          entityId: row.id,
          businessId: row.businessId,
          meta: { from: stored, endsAt: endsAt.toISOString() },
        });
        if (
          await this.sendNotice({
            subscriptionId: row.id,
            businessId: row.businessId,
            businessName: row.business.name,
            kind: DunningNoticeKind.EnteredGrace,
            periodKey,
            body: `VDB: اشتراک «${row.business.name}» وارد دوره مهلت شد. لطفاً تمدید کنید.`,
          })
        ) {
          noticesSent += 1;
        }
      }

      if (
        effective === SubscriptionStatus.Expired &&
        stored !== SubscriptionStatus.Expired
      ) {
        await this.prisma.subscription.update({
          where: { id: row.id },
          data: { status: PrismaSubscriptionStatus.expired },
        });
        transitionedExpired += 1;
        await this.audit.log({
          action: AuditActions.BillingSubscriptionExpired,
          entityType: 'subscription',
          entityId: row.id,
          businessId: row.businessId,
          meta: { from: stored, endsAt: endsAt.toISOString() },
        });
        if (
          await this.sendNotice({
            subscriptionId: row.id,
            businessId: row.businessId,
            businessName: row.business.name,
            kind: DunningNoticeKind.EnteredExpired,
            periodKey,
            body: `VDB: اشتراک «${row.business.name}» منقضی شد. داده‌ها حفظ شده‌اند — برای ادامه کار تمدید کنید.`,
          })
        ) {
          noticesSent += 1;
        }
        continue;
      }

      // Reminders only while still before/within paid period (trial/active).
      if (
        stored === SubscriptionStatus.Trial ||
        stored === SubscriptionStatus.Active
      ) {
        const daysLeft = Math.ceil(
          (endsAt.getTime() - now.getTime()) / 86_400_000,
        );
        if (daysLeft === 7) {
          if (
            await this.sendNotice({
              subscriptionId: row.id,
              businessId: row.businessId,
              businessName: row.business.name,
              kind: DunningNoticeKind.Reminder7d,
              periodKey,
              body: `VDB: اشتراک «${row.business.name}» تا ۷ روز دیگر پایان می‌یابد.`,
            })
          ) {
            noticesSent += 1;
          }
        }
        if (daysLeft === 1) {
          if (
            await this.sendNotice({
              subscriptionId: row.id,
              businessId: row.businessId,
              businessName: row.business.name,
              kind: DunningNoticeKind.Reminder1d,
              periodKey,
              body: `VDB: اشتراک «${row.business.name}» فردا پایان می‌یابد. لطفاً تمدید کنید.`,
            })
          ) {
            noticesSent += 1;
          }
        }
      }
    }

    this.logger.log(
      `Dunning tick scanned=${rows.length} grace=${transitionedGrace} expired=${transitionedExpired} sms=${noticesSent}`,
    );

    return {
      scanned: rows.length,
      transitionedGrace,
      transitionedExpired,
      noticesSent,
      skippedEdition: false,
    };
  }

  private async sendNotice(input: {
    subscriptionId: string;
    businessId: string;
    businessName: string;
    kind: DunningNoticeKindValue;
    periodKey: string;
    body: string;
  }): Promise<boolean> {
    try {
      await this.prisma.subscriptionDunningNotice.create({
        data: {
          subscriptionId: input.subscriptionId,
          businessId: input.businessId,
          kind: input.kind,
          periodKey: input.periodKey,
          meta: { businessName: input.businessName },
        },
      });
    } catch {
      // Unique violation = already sent for this period.
      return false;
    }

    const owners = await this.prisma.businessMembership.findMany({
      where: {
        businessId: input.businessId,
        role: MembershipRole.OWNER,
      },
      include: { user: { select: { mobile: true } } },
      take: 5,
    });

    for (const m of owners) {
      try {
        await this.sms.sendTransactional(m.user.mobile, input.body);
      } catch (err) {
        this.logger.warn(
          `Dunning SMS failed for ${input.businessId}: ${
            err instanceof Error ? err.message : 'error'
          }`,
        );
      }
    }

    await this.audit.log({
      action: AuditActions.BillingDunningNotice,
      entityType: 'subscription',
      entityId: input.subscriptionId,
      businessId: input.businessId,
      meta: { kind: input.kind, periodKey: input.periodKey },
    });
    return true;
  }
}
