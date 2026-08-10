import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExportJobStatus } from '@prisma/client';
import {
  AppEdition,
  AuditActions,
  PlatformAdminErrorCodes,
  type PublicPlatformAdminBusinessList,
  type PublicPlatformAdminFailedJobList,
  type PublicPlatformAdminMe,
  type PublicPlatformAdminSubscriptionList,
  type PublicPlatformAdminUserList,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { EditionService } from '../../config/edition/edition.service';
import type { AppEnv } from '../../config/env.validation';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SubscriptionService } from '../billing/subscription.service';

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly edition: EditionService,
    private readonly audit: AuditService,
    private readonly subscriptions: SubscriptionService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  assertSaasEdition(): void {
    if (!this.edition.isSaas()) {
      throw new DomainException(
        PlatformAdminErrorCodes.EditionRequired,
        'Platform admin requires SAAS edition',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async isPlatformAdmin(userId: string): Promise<boolean> {
    if (!this.edition.isSaas()) return false;
    const row = await this.prisma.platformAdmin.findUnique({
      where: { userId },
      select: { id: true },
    });
    return Boolean(row);
  }

  async me(userId: string): Promise<PublicPlatformAdminMe> {
    return {
      isPlatformAdmin: await this.isPlatformAdmin(userId),
      edition: this.edition.getEdition(),
    };
  }

  /** Upsert platform_admins for mobiles listed in PLATFORM_ADMIN_MOBILES. */
  async syncBootstrapAdmins(): Promise<number> {
    if (!this.edition.isSaas()) return 0;
    const raw = this.config.get('PLATFORM_ADMIN_MOBILES', { infer: true });
    const mobiles = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    let count = 0;
    for (const mobile of mobiles) {
      const user = await this.prisma.user.findUnique({ where: { mobile } });
      if (!user) continue;
      await this.prisma.platformAdmin.upsert({
        where: { userId: user.id },
        create: { userId: user.id, note: 'bootstrap env' },
        update: {},
      });
      count += 1;
    }
    return count;
  }

  async listUsers(input: {
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<PublicPlatformAdminUserList> {
    this.assertSaasEdition();
    const page = Math.max(1, input.page);
    const pageSize = Math.min(50, Math.max(1, input.pageSize));
    const q = input.q?.trim();
    const where = q
      ? {
          OR: [
            { mobile: { contains: q } },
            { id: { contains: q } },
          ],
        }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { memberships: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: rows.map((u) => ({
        id: u.id,
        mobile: u.mobile,
        trialConsumed: u.trialConsumed,
        membershipCount: u._count.memberships,
        createdAt: u.createdAt.toISOString(),
      })),
      page,
      pageSize,
      total,
    };
  }

  async listBusinesses(input: {
    page: number;
    pageSize: number;
    q?: string;
    suspended?: boolean;
  }): Promise<PublicPlatformAdminBusinessList> {
    this.assertSaasEdition();
    const page = Math.max(1, input.page);
    const pageSize = Math.min(50, Math.max(1, input.pageSize));
    const q = input.q?.trim();
    const where = {
      deletedAt: null,
      ...(input.suspended === true
        ? { suspendedAt: { not: null } }
        : input.suspended === false
          ? { suspendedAt: null }
          : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { id: { contains: q } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.business.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { memberships: true } } },
      }),
      this.prisma.business.count({ where }),
    ]);
    return {
      items: rows.map((b) => ({
        id: b.id,
        name: b.name,
        suspended: Boolean(b.suspendedAt),
        suspendedReason: b.suspendedReason,
        suspendedAt: b.suspendedAt ? b.suspendedAt.toISOString() : null,
        memberCount: b._count.memberships,
        createdAt: b.createdAt.toISOString(),
      })),
      page,
      pageSize,
      total,
    };
  }

  async suspendBusiness(input: {
    businessId: string;
    actorUserId: string;
    reason?: string;
  }) {
    this.assertSaasEdition();
    const business = await this.prisma.business.findFirst({
      where: { id: input.businessId, deletedAt: null },
    });
    if (!business) {
      throw new DomainException(
        PlatformAdminErrorCodes.BusinessNotFound,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const reason = input.reason?.trim().slice(0, 500) || null;
    const updated = await this.prisma.business.update({
      where: { id: business.id },
      data: {
        suspendedAt: business.suspendedAt ?? new Date(),
        suspendedReason: reason,
        suspendedByUserId: input.actorUserId,
      },
    });
    await this.audit.log({
      action: AuditActions.PlatformBusinessSuspend,
      entityType: 'business',
      entityId: business.id,
      businessId: business.id,
      userId: input.actorUserId,
      meta: { reason },
    });
    return {
      id: updated.id,
      name: updated.name,
      suspended: true,
      suspendedReason: updated.suspendedReason,
      suspendedAt: updated.suspendedAt!.toISOString(),
      memberCount: await this.prisma.businessMembership.count({
        where: { businessId: updated.id },
      }),
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async unsuspendBusiness(input: {
    businessId: string;
    actorUserId: string;
  }) {
    this.assertSaasEdition();
    const business = await this.prisma.business.findFirst({
      where: { id: input.businessId, deletedAt: null },
    });
    if (!business) {
      throw new DomainException(
        PlatformAdminErrorCodes.BusinessNotFound,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const updated = await this.prisma.business.update({
      where: { id: business.id },
      data: {
        suspendedAt: null,
        suspendedReason: null,
        suspendedByUserId: null,
      },
    });
    await this.audit.log({
      action: AuditActions.PlatformBusinessUnsuspend,
      entityType: 'business',
      entityId: business.id,
      businessId: business.id,
      userId: input.actorUserId,
      meta: {},
    });
    return {
      id: updated.id,
      name: updated.name,
      suspended: false,
      suspendedReason: null,
      suspendedAt: null,
      memberCount: await this.prisma.businessMembership.count({
        where: { businessId: updated.id },
      }),
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async listSubscriptions(input: {
    page: number;
    pageSize: number;
    status?: string;
  }): Promise<PublicPlatformAdminSubscriptionList> {
    this.assertSaasEdition();
    const page = Math.max(1, input.page);
    const pageSize = Math.min(50, Math.max(1, input.pageSize));
    const status = input.status?.trim();
    const where = {
      ...(status ? { status: status as never } : {}),
      business: { deletedAt: null },
    };
    const [rows, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          plan: true,
          business: { select: { name: true, suspendedAt: true, deletedAt: true } },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);
    return {
      items: rows.map((r) => {
        const effectiveStatus = this.subscriptions.resolveEffectiveStatus(
          r.status,
          r.endsAt,
        );
        return {
          id: r.id,
          businessId: r.businessId,
          businessName: r.business.name,
          planCode: r.plan?.code ?? null,
          status: r.status,
          effectiveStatus,
          startsAt: r.startsAt.toISOString(),
          endsAt: r.endsAt ? r.endsAt.toISOString() : null,
          businessSuspended: Boolean(r.business.suspendedAt),
        };
      }),
      page,
      pageSize,
      total,
    };
  }

  async listFailedJobs(input: {
    page: number;
    pageSize: number;
  }): Promise<PublicPlatformAdminFailedJobList> {
    this.assertSaasEdition();
    const page = Math.max(1, input.page);
    const pageSize = Math.min(50, Math.max(1, input.pageSize));
    const where = { status: ExportJobStatus.failed };
    const [rows, total] = await Promise.all([
      this.prisma.exportJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.exportJob.count({ where }),
    ]);
    return {
      items: rows.map((j) => ({
        id: j.id,
        kind: 'export' as const,
        businessId: j.businessId,
        documentId: j.documentId,
        errorCode: j.errorCode,
        errorMessage: j.errorMessage,
        createdAt: j.createdAt.toISOString(),
        finishedAt: j.finishedAt ? j.finishedAt.toISOString() : null,
      })),
      page,
      pageSize,
      total,
    };
  }

  /** Soft check used by /me without throwing on SELF_HOSTED. */
  getEdition(): AppEdition {
    return this.edition.getEdition();
  }
}
