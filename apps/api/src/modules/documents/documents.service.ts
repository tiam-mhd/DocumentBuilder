import { HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import { ZodError } from 'zod';
import {
  DocumentStatus as PrismaDocumentStatus,
  type Document as PrismaDocument,
} from '@prisma/client';
import {
  createDocumentBodyFromTemplate,
  createEmptyDocumentBody,
  createEmptyTemplateBody,
  parseDocumentBody,
  documentCollectRequiredModuleCodes,
  DOCUMENT_SCHEMA_VERSION,
} from '@vdb/document-schema';
import {
  AuditActions,
  DocumentErrorCodes,
  DocumentStatus,
  DOCUMENT_BODY_LOCKED_STATUSES,
  parseContentLocale,
  type EntitlementCode,
  type PublicDocument,
  type PublicDocumentDetail,
  type PublicDocumentList,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { TemplateBodyRepository } from '../design/template-body.repository';
import { DocumentBodyRepository } from './document-body.repository';
import { DocumentVersionsService } from './document-versions.service';

@Injectable()
export class DocumentsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bodies: DocumentBodyRepository,
    private readonly entitlements: EntitlementsService,
    private readonly templateBodies: TemplateBodyRepository,
    private readonly versions: DocumentVersionsService,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.bodies.ensureIndexes();
    } catch {
      // Mongo may be down at boot.
    }
  }

  async list(input: {
    businessId: string;
    page: number;
    pageSize: number;
    q?: string;
    status?: string;
  }): Promise<PublicDocumentList> {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(100, Math.max(1, input.pageSize));
    const q = input.q?.trim();
    const status = this.optionalStatus(input.status);
    const where = {
      businessId: input.businessId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(q
        ? { title: { contains: q, mode: 'insensitive' as const } }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.document.count({ where }),
    ]);
    const ids = rows.map((r) => r.id);
    const latestMap = new Map<string, number>();
    if (ids.length > 0) {
      const grouped = await this.prisma.documentVersion.groupBy({
        by: ['documentId'],
        where: { businessId: input.businessId, documentId: { in: ids } },
        _max: { versionNumber: true },
      });
      for (const g of grouped) {
        if (g._max.versionNumber != null) {
          latestMap.set(g.documentId, g._max.versionNumber);
        }
      }
    }
    const items = await Promise.all(
      rows.map((r) => this.toPublicMeta(r, latestMap.get(r.id) ?? null)),
    );
    return {
      items,
      page,
      pageSize,
      total,
    };
  }

  async get(
    businessId: string,
    documentId: string,
  ): Promise<PublicDocumentDetail> {
    const row = await this.requireMeta(businessId, documentId);
    let body = await this.bodies.find(businessId, documentId);
    if (!body) {
      body = createEmptyDocumentBody(businessId, documentId, {
        title: row.title,
        templateId: row.templateId,
      });
      await this.bodies.upsert(body);
    }
    return { ...(await this.toPublicMeta(row)), body };
  }

  async create(input: {
    businessId: string;
    title: string;
    templateId: string;
    locale?: string;
  }): Promise<PublicDocumentDetail> {
    const title = this.validateTitle(input.title);
    const locale = parseContentLocale(input.locale);
    const templateId = input.templateId?.trim();
    if (!templateId) {
      throw new DomainException(
        DocumentErrorCodes.TemplateRequired,
        'templateId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const template = await this.prisma.documentTemplate.findFirst({
      where: {
        id: templateId,
        businessId: input.businessId,
        deletedAt: null,
      },
    });
    if (!template) {
      throw new DomainException(
        DocumentErrorCodes.TemplateNotFound,
        'Template not found for this business',
        HttpStatus.BAD_REQUEST,
      );
    }

    let templateBody = await this.templateBodies.find(
      input.businessId,
      templateId,
    );
    if (!templateBody) {
      templateBody = createEmptyTemplateBody(input.businessId, templateId);
      await this.templateBodies.upsert(templateBody);
    }

    const row = await this.prisma.document.create({
      data: {
        businessId: input.businessId,
        templateId,
        title,
        locale,
        status: PrismaDocumentStatus.draft,
      },
    });

    const body = {
      ...createDocumentBodyFromTemplate({
        businessId: input.businessId,
        documentId: row.id,
        templateId,
        title,
        templateBody,
      }),
      locale,
    };

    try {
      await this.bodies.upsert(body);
    } catch {
      await this.prisma.document.delete({ where: { id: row.id } });
      throw new DomainException(
        DocumentErrorCodes.StorageError,
        'Failed to store document body',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return { ...(await this.toPublicMeta(row)), body };
  }

  async update(input: {
    businessId: string;
    documentId: string;
    userId?: string;
    title?: string;
    locale?: string;
    body?: unknown;
  }): Promise<PublicDocumentDetail> {
    void input.userId;
    const row = await this.requireMeta(input.businessId, input.documentId);
    const data: {
      title?: string;
      locale?: string;
    } = {};

    if (input.title !== undefined) {
      data.title = this.validateTitle(input.title);
    }
    if (input.locale !== undefined) {
      data.locale = parseContentLocale(input.locale);
    }

    const bodyLocked = DOCUMENT_BODY_LOCKED_STATUSES.includes(
      row.status as (typeof DOCUMENT_BODY_LOCKED_STATUSES)[number],
    );

    if (input.body !== undefined && bodyLocked) {
      throw new DomainException(
        DocumentErrorCodes.PublishedLocked,
        'Document body is locked until returned to draft',
        HttpStatus.CONFLICT,
      );
    }

    let body =
      (await this.bodies.find(input.businessId, input.documentId)) ??
      createEmptyDocumentBody(input.businessId, input.documentId, {
        title: row.title,
        templateId: row.templateId,
      });

    if (input.body !== undefined) {
      try {
        body = parseDocumentBody({
          ...(input.body as object),
          businessId: input.businessId,
          documentId: input.documentId,
          schemaVersion: DOCUMENT_SCHEMA_VERSION,
          templateId:
            (input.body as { templateId?: string | null }).templateId ??
            row.templateId,
          title:
            data.title ??
            (input.body as { title?: string }).title ??
            row.title,
          locale:
            data.locale ??
            (input.body as { locale?: string }).locale ??
            row.locale,
        });
      } catch (err) {
        this.rethrowBodyError(err);
      }
      if (data.locale === undefined) {
        data.locale = body.locale;
      }
      for (const code of documentCollectRequiredModuleCodes(body)) {
        await this.entitlements.assertModule(
          input.businessId,
          code as EntitlementCode,
        );
      }
    } else if (data.locale !== undefined && body.locale !== data.locale) {
      body = { ...body, locale: parseContentLocale(data.locale) };
    } else if (data.title && body.title !== data.title) {
      body = { ...body, title: data.title };
    }

    const updated =
      Object.keys(data).length > 0
        ? await this.prisma.document.update({
            where: { id: row.id },
            data,
          })
        : row;

    if (input.body !== undefined || data.locale !== undefined || data.title) {
      try {
        await this.bodies.upsert({
          ...body,
          title: updated.title,
          locale: parseContentLocale(updated.locale),
        });
        body = {
          ...body,
          title: updated.title,
          locale: parseContentLocale(updated.locale),
        };
      } catch {
        throw new DomainException(
          DocumentErrorCodes.StorageError,
          'Failed to store document body',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }

    return { ...(await this.toPublicMeta(updated)), body };
  }

  async softDelete(
    businessId: string,
    documentId: string,
    userId?: string | null,
  ): Promise<void> {
    const meta = await this.requireMeta(businessId, documentId);
    await this.prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });
    try {
      await this.bodies.delete(businessId, documentId);
    } catch {
      // PG soft-delete is list source of truth.
    }
    try {
      await this.versions.deleteBodiesForDocument(businessId, documentId);
    } catch {
      // best-effort
    }
    await this.audit.log({
      action: AuditActions.DocumentDelete,
      entityType: 'document',
      entityId: documentId,
      businessId,
      userId: userId ?? null,
      meta: { title: meta.title },
    });
  }

  private async requireMeta(businessId: string, documentId: string) {
    const row = await this.prisma.document.findFirst({
      where: { id: documentId, businessId, deletedAt: null },
    });
    if (!row) {
      throw new DomainException(
        DocumentErrorCodes.NotFound,
        'Document not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private validateTitle(title: string): string {
    const trimmed = title.trim();
    if (trimmed.length < 1 || trimmed.length > 200) {
      throw new DomainException(
        DocumentErrorCodes.InvalidTitle,
        'Document title is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }
    return trimmed;
  }

  private requireStatus(status: string): PrismaDocumentStatus {
    const allowed = Object.values(DocumentStatus) as string[];
    if (!allowed.includes(status)) {
      throw new DomainException(
        DocumentErrorCodes.InvalidStatus,
        'Document status is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }
    return status as PrismaDocumentStatus;
  }

  private optionalStatus(status?: string): PrismaDocumentStatus | undefined {
    if (!status) return undefined;
    return this.requireStatus(status);
  }

  private rethrowBodyError(err: unknown): never {
    if (err instanceof ZodError) {
      throw new DomainException(
        DocumentErrorCodes.InvalidBody,
        err.issues[0]?.message ?? 'Invalid document body',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (err instanceof DomainException) throw err;
    throw new DomainException(
      DocumentErrorCodes.InvalidBody,
      'Invalid document body',
      HttpStatus.BAD_REQUEST,
    );
  }

  private async toPublicMeta(
    row: PrismaDocument,
    latestVersionNumber?: number | null,
  ): Promise<PublicDocument> {
    const latest =
      latestVersionNumber !== undefined
        ? latestVersionNumber
        : await this.versions.latestVersionNumber(row.businessId, row.id);
    return {
      id: row.id,
      businessId: row.businessId,
      templateId: row.templateId,
      title: row.title,
      locale: parseContentLocale(row.locale),
      status: row.status,
      latestVersionNumber: latest,
      webSlug: row.webSlug,
      webPublished: row.webPublished,
      webPublishedAt: row.webPublishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
