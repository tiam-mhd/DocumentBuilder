import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AnalyticsEventKind as PrismaKind,
  AnalyticsEventSource as PrismaSource,
} from '@prisma/client';
import type { Job } from 'bullmq';
import {
  AnalyticsEventKind,
  AnalyticsDevice,
  type AnalyticsDeviceValue,
  type AnalyticsEventKindValue,
  type AnalyticsEventSourceValue,
  type PublicAnalyticsSummary,
} from '@vdb/shared-types';
import { PrismaService } from '../../config/prisma/prisma.service';
import {
  AnalyticsQueueService,
  type AnalyticsIngestPayload,
} from './analytics-queue.service';

@Injectable()
export class AnalyticsService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: AnalyticsQueueService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.queue.startWorker((job) => this.processJob(job));
  }

  /**
   * Fire-and-forget track — never throws to callers.
   * Skipped when ANALYTICS_ENABLED=false.
   */
  track(input: {
    businessId: string;
    documentId: string;
    kind: AnalyticsEventKindValue;
    source: AnalyticsEventSourceValue;
    country?: string | null;
    device?: AnalyticsDeviceValue | null;
  }): void {
    if (!this.config.get<boolean>('ANALYTICS_ENABLED', true)) {
      return;
    }
    const payload: AnalyticsIngestPayload = {
      businessId: input.businessId,
      documentId: input.documentId,
      kind: input.kind,
      source: input.source,
      country: input.country ?? null,
      device: input.device ?? AnalyticsDevice.Unknown,
      occurredAt: new Date().toISOString(),
    };
    void this.queue.enqueue(payload).catch((err: unknown) => {
      this.logger.warn(
        `Analytics enqueue failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }

  async summary(input: {
    businessId: string;
    from?: string;
    to?: string;
  }): Promise<PublicAnalyticsSummary> {
    const from = input.from ? new Date(input.from) : null;
    const to = input.to ? new Date(input.to) : null;
    const createdAt =
      from || to
        ? {
            ...(from && !Number.isNaN(from.getTime())
              ? { gte: from }
              : {}),
            ...(to && !Number.isNaN(to.getTime()) ? { lte: to } : {}),
          }
        : undefined;

    const where = {
      businessId: input.businessId,
      ...(createdAt ? { createdAt } : {}),
    };

    const [rows, docs] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        where,
        select: {
          kind: true,
          device: true,
          country: true,
          documentId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 20_000,
      }),
      this.prisma.document.findMany({
        where: { businessId: input.businessId, deletedAt: null },
        select: { id: true, title: true },
      }),
    ]);

    const titleById = new Map(docs.map((d) => [d.id, d.title]));
    let views = 0;
    let downloads = 0;
    const byDayMap = new Map<string, { views: number; downloads: number }>();
    const byDeviceMap = new Map<string, number>();
    const byCountryMap = new Map<string, number>();
    const byDocMap = new Map<string, { views: number; downloads: number }>();

    for (const row of rows) {
      const isView = row.kind === PrismaKind.view;
      if (isView) views += 1;
      else downloads += 1;

      const day = row.createdAt.toISOString().slice(0, 10);
      const dayBucket = byDayMap.get(day) ?? { views: 0, downloads: 0 };
      if (isView) dayBucket.views += 1;
      else dayBucket.downloads += 1;
      byDayMap.set(day, dayBucket);

      const device = row.device ?? AnalyticsDevice.Unknown;
      byDeviceMap.set(device, (byDeviceMap.get(device) ?? 0) + 1);

      if (row.country) {
        byCountryMap.set(
          row.country,
          (byCountryMap.get(row.country) ?? 0) + 1,
        );
      }

      const docBucket = byDocMap.get(row.documentId) ?? {
        views: 0,
        downloads: 0,
      };
      if (isView) docBucket.views += 1;
      else docBucket.downloads += 1;
      byDocMap.set(row.documentId, docBucket);
    }

    return {
      from: from && !Number.isNaN(from.getTime()) ? from.toISOString() : null,
      to: to && !Number.isNaN(to.getTime()) ? to.toISOString() : null,
      totals: { views, downloads },
      byDay: [...byDayMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, v]) => ({ day, ...v })),
      byDevice: [...byDeviceMap.entries()]
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count),
      byCountry: [...byCountryMap.entries()]
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50),
      byDocument: [...byDocMap.entries()]
        .map(([documentId, v]) => ({
          documentId,
          title: titleById.get(documentId) ?? documentId,
          ...v,
        }))
        .sort((a, b) => b.views + b.downloads - (a.views + a.downloads))
        .slice(0, 50),
    };
  }

  async processJob(job: Job<AnalyticsIngestPayload>): Promise<void> {
    const p = job.data;
    await this.prisma.$transaction(async (tx) => {
      await tx.analyticsEvent.create({
        data: {
          businessId: p.businessId,
          documentId: p.documentId,
          kind:
            p.kind === AnalyticsEventKind.Download
              ? PrismaKind.download
              : PrismaKind.view,
          source: p.source as PrismaSource,
          country: p.country,
          device: p.device,
          createdAt: new Date(p.occurredAt),
        },
      });
      if (p.kind === AnalyticsEventKind.Download) {
        await tx.document.updateMany({
          where: { id: p.documentId, businessId: p.businessId },
          data: { analyticsDownloadCount: { increment: 1 } },
        });
      } else {
        await tx.document.updateMany({
          where: { id: p.documentId, businessId: p.businessId },
          data: { analyticsViewCount: { increment: 1 } },
        });
      }
    });
  }
}
