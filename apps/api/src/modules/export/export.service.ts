import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  ExportJobStatus as PrismaExportStatus,
  type ExportJob,
} from '@prisma/client';
import type { Job } from 'bullmq';
import {
  documentCollectRequiredModuleCodes,
  documentCollectRepeaterSources,
  documentCollectVisibilitySources,
  parseDocumentBody,
  parseMapBlockProps,
  parseOrgChartBlockProps,
  parseRepeaterBlockProps,
  parseTimelineBlockProps,
  type BlockNode,
  type VisibilityContext,
} from '@vdb/document-schema';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';
import {
  OBJECT_STORAGE,
  type ObjectStorage,
} from '../assets/storage/object-storage.port';
import { CollectionService } from '../content/collection.service';
import { MapService } from '../content/map.service';
import { OrgChartService } from '../content/org-chart.service';
import { QrService } from '../content/qr.service';
import { TimelineService } from '../content/timeline.service';
import { DocumentBodyRepository } from '../documents/document-body.repository';
import {
  DocumentHtmlRenderer,
  type MapMarkerPoint,
  type OrgChartRenderTree,
  type QrRenderData,
  type TimelineRenderData,
} from './document-html.renderer';
import type { EntitlementCode, PublicCollectionItem } from '@vdb/shared-types';
import {
  DEFAULT_DESIGN_THEME_TOKENS,
  ExportErrorCodes,
  type DesignThemeTokens,
  type PublicExportJob,
} from '@vdb/shared-types';
import {
  ExportQueueService,
  type ExportPdfJobPayload,
} from './export-queue.service';
import { PDF_RENDERER, type PdfRenderer } from './pdf/pdf-renderer.port';

@Injectable()
export class ExportService implements OnModuleInit {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bodies: DocumentBodyRepository,
    private readonly queue: ExportQueueService,
    private readonly html: DocumentHtmlRenderer,
    private readonly maps: MapService,
    private readonly orgChart: OrgChartService,
    private readonly timeline: TimelineService,
    private readonly qr: QrService,
    private readonly collections: CollectionService,
    private readonly entitlements: EntitlementsService,
    @Inject(PDF_RENDERER) private readonly pdf: PdfRenderer,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  onModuleInit(): void {
    this.queue.startWorker((job) => this.processJob(job));
  }

  async createPdfJob(input: {
    businessId: string;
    documentId: string;
  }): Promise<PublicExportJob> {
    const doc = await this.prisma.document.findFirst({
      where: {
        id: input.documentId,
        businessId: input.businessId,
        deletedAt: null,
      },
    });
    if (!doc) {
      throw new DomainException(
        ExportErrorCodes.DocumentNotFound,
        'Document not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const rawBody = await this.bodies.find(input.businessId, input.documentId);
    if (rawBody) {
      const parsed = parseDocumentBody(rawBody);
      for (const code of documentCollectRequiredModuleCodes(parsed)) {
        await this.entitlements.assertModule(
          input.businessId,
          code as EntitlementCode,
        );
      }
    }

    const row = await this.prisma.exportJob.create({
      data: {
        businessId: input.businessId,
        documentId: input.documentId,
        status: PrismaExportStatus.queued,
      },
    });

    try {
      await this.queue.enqueue({
        jobId: row.id,
        businessId: input.businessId,
        documentId: input.documentId,
      });
    } catch (err) {
      await this.prisma.exportJob.update({
        where: { id: row.id },
        data: {
          status: PrismaExportStatus.failed,
          errorCode: ExportErrorCodes.QueueUnavailable,
          errorMessage: err instanceof Error ? err.message : 'Queue error',
          finishedAt: new Date(),
        },
      });
      throw new DomainException(
        ExportErrorCodes.QueueUnavailable,
        'Export queue unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return this.toPublic(row);
  }

  async getJob(
    businessId: string,
    jobId: string,
  ): Promise<PublicExportJob> {
    const row = await this.requireJob(businessId, jobId);
    return this.toPublic(row);
  }

  async listForDocument(input: {
    businessId: string;
    documentId: string;
    page: number;
    pageSize: number;
  }): Promise<{ items: PublicExportJob[]; page: number; pageSize: number; total: number }> {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(50, Math.max(1, input.pageSize));
    const where = {
      businessId: input.businessId,
      documentId: input.documentId,
    };
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
      items: rows.map((r) => this.toPublic(r)),
      page,
      pageSize,
      total,
    };
  }

  async readFile(
    businessId: string,
    jobId: string,
  ): Promise<{ body: Buffer; contentType: string; filename: string }> {
    const row = await this.requireJob(businessId, jobId);
    if (row.status !== PrismaExportStatus.completed || !row.storageKey) {
      throw new DomainException(
        ExportErrorCodes.NotReady,
        'Export is not ready for download',
        HttpStatus.CONFLICT,
      );
    }
    const file = await this.storage.get(row.storageKey);
    if (!file) {
      throw new DomainException(
        ExportErrorCodes.NotFound,
        'Export file missing from storage',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      body: file.body,
      contentType: row.mimeType || file.contentType,
      filename: `document-${row.documentId}.pdf`,
    };
  }

  async processJob(job: Job<ExportPdfJobPayload>): Promise<void> {
    const { jobId, businessId, documentId } = job.data;
    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: PrismaExportStatus.processing,
        startedAt: new Date(),
      },
    });

    try {
      const doc = await this.prisma.document.findFirst({
        where: { id: documentId, businessId, deletedAt: null },
      });
      if (!doc) {
        throw new Error('Document not found');
      }

      let body = await this.bodies.find(businessId, documentId);
      if (!body) {
        throw new Error('Document body not found');
      }
      body = parseDocumentBody(body);

      const theme = await this.resolveTheme(businessId, doc.templateId);
      const fonts = await this.loadFonts(businessId, theme);
      const mapMarkersByBlockId = await this.resolveMapMarkers(
        businessId,
        body,
      );
      const orgChartByBlockId = await this.resolveOrgCharts(businessId, body);
      const timelineByBlockId = await this.resolveTimelines(businessId, body);
      const qrByBlockId = await this.resolveQrCodes(body);
      const repeaterItemsByBlockId = await this.resolveRepeaters(
        businessId,
        body,
      );
      const visibility = await this.resolveVisibility(businessId, body);

      const html = this.html.build({
        title: doc.title,
        body,
        tokens: theme,
        fonts,
        dir: 'rtl',
        lang: 'fa',
        mapMarkersByBlockId,
        orgChartByBlockId,
        timelineByBlockId,
        qrByBlockId,
        repeaterItemsByBlockId,
        visibility,
      });

      const pdf = await this.pdf.render({
        html,
        format: body.page.size === 'A3' ? 'A3' : 'A4',
        landscape: body.page.orientation === 'landscape',
      });

      const storageKey = `${businessId}/exports/${jobId}/document.pdf`;
      await this.storage.put(storageKey, pdf, 'application/pdf');

      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: PrismaExportStatus.completed,
          storageKey,
          byteSize: pdf.byteLength,
          mimeType: 'application/pdf',
          finishedAt: new Date(),
          errorCode: null,
          errorMessage: null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Render failed';
      this.logger.error(`Export ${jobId} failed: ${message}`);
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: PrismaExportStatus.failed,
          errorCode: ExportErrorCodes.RenderFailed,
          errorMessage: message.slice(0, 500),
          finishedAt: new Date(),
        },
      });
      throw err;
    }
  }

  private async resolveMapMarkers(
    businessId: string,
    body: ReturnType<typeof parseDocumentBody>,
  ): Promise<Record<string, MapMarkerPoint[]>> {
    const out: Record<string, MapMarkerPoint[]> = {};
    const visit = async (blocks: BlockNode[]) => {
      for (const b of blocks) {
        if (b.type === 'map') {
          const props = parseMapBlockProps(b.props);
          if (!props.showMarkers || props.markersSource === 'none') {
            out[b.id] = [];
          } else {
            const list = await this.maps.listMarkers({
              businessId,
              source: props.markersSource,
              country: props.countryRestriction ?? undefined,
            });
            out[b.id] = list.items.map((m) => ({
              lat: m.lat,
              lng: m.lng,
              name: m.name,
            }));
          }
        }
        if (b.children?.length) await visit(b.children);
      }
    };
    for (const page of body.pages) {
      await visit(page.blocks);
    }
    for (const master of body.masters) {
      await visit(master.header.blocks);
      await visit(master.footer.blocks);
    }
    return out;
  }

  private async resolveOrgCharts(
    businessId: string,
    body: ReturnType<typeof parseDocumentBody>,
  ): Promise<Record<string, OrgChartRenderTree>> {
    const out: Record<string, OrgChartRenderTree> = {};
    const visit = async (blocks: BlockNode[]) => {
      for (const b of blocks) {
        if (b.type === 'orgChart') {
          const props = parseOrgChartBlockProps(b.props);
          const tree = await this.orgChart.getTree({
            businessId,
            rootMemberId: props.rootMemberId,
          });
          out[b.id] = {
            layout: props.layout,
            showPhotos: props.showPhotos,
            heightPx: props.heightPx,
            roots: tree.roots,
          };
        }
        if (b.children?.length) await visit(b.children);
      }
    };
    for (const page of body.pages) {
      await visit(page.blocks);
    }
    for (const master of body.masters) {
      await visit(master.header.blocks);
      await visit(master.footer.blocks);
    }
    return out;
  }

  private async resolveTimelines(
    businessId: string,
    body: ReturnType<typeof parseDocumentBody>,
  ): Promise<Record<string, TimelineRenderData>> {
    const out: Record<string, TimelineRenderData> = {};
    const visit = async (blocks: BlockNode[]) => {
      for (const b of blocks) {
        if (b.type === 'timeline') {
          const props = parseTimelineBlockProps(b.props);
          const items = await this.timeline.listForBlock({
            businessId,
            limit: props.limit,
          });
          out[b.id] = {
            layout: props.layout,
            heightPx: props.heightPx,
            items,
          };
        }
        if (b.children?.length) await visit(b.children);
      }
    };
    for (const page of body.pages) {
      await visit(page.blocks);
    }
    for (const master of body.masters) {
      await visit(master.header.blocks);
      await visit(master.footer.blocks);
    }
    return out;
  }

  private async resolveVisibility(
    businessId: string,
    body: ReturnType<typeof parseDocumentBody>,
  ): Promise<VisibilityContext> {
    const sources = new Set([
      ...documentCollectVisibilitySources(body),
      ...documentCollectRepeaterSources(body),
    ]);
    const collection: Record<string, number> = {};
    for (const source of sources) {
      try {
        collection[source] = await this.collections.count(businessId, source);
      } catch {
        collection[source] = 0;
      }
    }
    return { collection };
  }

  private async resolveRepeaters(
    businessId: string,
    body: ReturnType<typeof parseDocumentBody>,
  ): Promise<Record<string, PublicCollectionItem[]>> {
    const out: Record<string, PublicCollectionItem[]> = {};
    const visit = async (blocks: BlockNode[]) => {
      for (const b of blocks) {
        if (b.type === 'repeater') {
          const props = parseRepeaterBlockProps(b.props);
          const list = await this.collections.list({
            businessId,
            source: props.source,
            limit: props.limit,
          });
          out[b.id] = list.items;
        }
        if (b.children?.length) await visit(b.children);
      }
    };
    for (const page of body.pages) {
      await visit(page.blocks);
    }
    for (const master of body.masters) {
      await visit(master.header.blocks);
      await visit(master.footer.blocks);
    }
    return out;
  }

  private async resolveQrCodes(
    body: ReturnType<typeof parseDocumentBody>,
  ): Promise<Record<string, QrRenderData>> {
    const out: Record<string, QrRenderData> = {};
    const visit = async (blocks: BlockNode[]) => {
      for (const b of blocks) {
        if (b.type === 'qr') {
          const encoded = await this.qr.tryEncodeForBlock(b.props);
          out[b.id] = {
            dataUrl: encoded?.dataUrl ?? null,
            sizePx: encoded?.sizePx ?? 128,
            caption: String(b.props.caption ?? ''),
            payload: encoded?.payload ?? '',
          };
        }
        if (b.children?.length) await visit(b.children);
      }
    };
    for (const page of body.pages) {
      await visit(page.blocks);
    }
    for (const master of body.masters) {
      await visit(master.header.blocks);
      await visit(master.footer.blocks);
    }
    return out;
  }

  private async resolveTheme(
    businessId: string,
    templateId: string | null,
  ): Promise<DesignThemeTokens> {
    if (templateId) {
      const template = await this.prisma.documentTemplate.findFirst({
        where: { id: templateId, businessId, deletedAt: null },
        select: { themeId: true },
      });
      if (template?.themeId) {
        const theme = await this.prisma.designTheme.findFirst({
          where: { id: template.themeId, businessId, deletedAt: null },
        });
        if (theme) {
          return theme.tokens as DesignThemeTokens;
        }
      }
    }
    const def = await this.prisma.designTheme.findFirst({
      where: { businessId, deletedAt: null, isDefault: true },
      orderBy: { createdAt: 'asc' },
    });
    if (def) return def.tokens as DesignThemeTokens;
    return DEFAULT_DESIGN_THEME_TOKENS;
  }

  private async loadFonts(
    businessId: string,
    tokens: DesignThemeTokens,
  ): Promise<
    {
      family: string;
      weight: number;
      style: 'normal' | 'italic';
      mimeType: string;
      base64: string;
    }[]
  > {
    const ids = [
      tokens.fonts?.headingFontFaceId,
      tokens.fonts?.bodyFontFaceId,
    ].filter((id): id is string => Boolean(id));

    const faces =
      ids.length > 0
        ? await this.prisma.fontFace.findMany({
            where: { businessId, deletedAt: null, id: { in: ids } },
          })
        : await this.prisma.fontFace.findMany({
            where: { businessId, deletedAt: null },
            take: 4,
            orderBy: { createdAt: 'asc' },
          });

    const embedded: {
      family: string;
      weight: number;
      style: 'normal' | 'italic';
      mimeType: string;
      base64: string;
    }[] = [];

    for (const face of faces) {
      const file = await this.storage.get(face.storageKey);
      if (!file) continue;
      embedded.push({
        family: face.family,
        weight: face.weight,
        style: face.style === 'italic' ? 'italic' : 'normal',
        mimeType: face.mimeType || file.contentType,
        base64: file.body.toString('base64'),
      });
    }
    return embedded;
  }

  private async requireJob(businessId: string, jobId: string) {
    const row = await this.prisma.exportJob.findFirst({
      where: { id: jobId, businessId },
    });
    if (!row) {
      throw new DomainException(
        ExportErrorCodes.NotFound,
        'Export job not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private toPublic(row: ExportJob): PublicExportJob {
    const downloadUrl =
      row.status === PrismaExportStatus.completed
        ? `/businesses/${row.businessId}/exports/${row.id}/file`
        : null;
    return {
      id: row.id,
      businessId: row.businessId,
      documentId: row.documentId,
      status: row.status,
      errorCode: row.errorCode,
      errorMessage: row.errorMessage,
      byteSize: row.byteSize,
      mimeType: row.mimeType,
      downloadUrl,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      startedAt: row.startedAt?.toISOString() ?? null,
      finishedAt: row.finishedAt?.toISOString() ?? null,
    };
  }
}
