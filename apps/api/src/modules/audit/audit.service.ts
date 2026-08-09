import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AuditActions,
  type PublicAuditEvent,
  type PublicAuditEventList,
} from '@vdb/shared-types';
import { PrismaService } from '../../config/prisma/prisma.service';

export type AuditLogInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  businessId?: string | null;
  userId?: string | null;
  meta?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          action: input.action.slice(0, 120),
          entityType: input.entityType.slice(0, 80),
          entityId: input.entityId ?? null,
          businessId: input.businessId ?? null,
          userId: input.userId ?? null,
          meta: (input.meta ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch {
      // Audit must not break the primary write path.
    }
  }

  async listForBusiness(input: {
    businessId: string;
    page?: number;
    pageSize?: number;
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }): Promise<PublicAuditEventList> {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));

    const memberRows = await this.prisma.businessMembership.findMany({
      where: { businessId: input.businessId },
      select: { userId: true },
    });
    const memberIds = memberRows.map((m) => m.userId);

    const scope: Prisma.AuditEventWhereInput = {
      OR: [
        { businessId: input.businessId },
        {
          businessId: null,
          action: AuditActions.AuthLogin,
          userId: { in: memberIds.length > 0 ? memberIds : ['__none__'] },
        },
        {
          businessId: null,
          action: AuditActions.BillingLicenseActivated,
        },
      ],
    };

    const filters: Prisma.AuditEventWhereInput[] = [scope];

    if (input.action?.trim()) {
      filters.push({ action: input.action.trim().slice(0, 120) });
    }
    if (input.entityType?.trim()) {
      filters.push({ entityType: input.entityType.trim().slice(0, 80) });
    }

    const createdAt: Prisma.DateTimeFilter = {};
    if (input.from) {
      const from = new Date(input.from);
      if (!Number.isNaN(from.getTime())) createdAt.gte = from;
    }
    if (input.to) {
      const to = new Date(input.to);
      if (!Number.isNaN(to.getTime())) {
        if (input.to.trim().length <= 10) {
          to.setUTCHours(23, 59, 59, 999);
        }
        createdAt.lte = to;
      }
    }
    if (Object.keys(createdAt).length > 0) {
      filters.push({ createdAt });
    }

    const where: Prisma.AuditEventWhereInput = { AND: filters };

    const [rows, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toPublic(row)),
      total,
      page,
      pageSize,
    };
  }

  private toPublic(row: {
    id: string;
    businessId: string | null;
    userId: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    meta: Prisma.JsonValue;
    createdAt: Date;
  }): PublicAuditEvent {
    const meta =
      row.meta && typeof row.meta === 'object' && !Array.isArray(row.meta)
        ? (row.meta as Record<string, unknown>)
        : {};
    return {
      id: row.id,
      businessId: row.businessId,
      userId: row.userId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      meta,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
