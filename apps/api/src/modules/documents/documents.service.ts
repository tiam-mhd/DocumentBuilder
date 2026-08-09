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
  DocumentErrorCodes,
  DocumentStatus,
  type EntitlementCode,
  type PublicDocument,
  type PublicDocumentDetail,
  type PublicDocumentList,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { TemplateBodyRepository } from '../design/template-body.repository';
import { DocumentBodyRepository } from './document-body.repository';

@Injectable()
export class DocumentsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bodies: DocumentBodyRepository,
    private readonly entitlements: EntitlementsService,
    private readonly templateBodies: TemplateBodyRepository,
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
    return {
      items: rows.map((r) => this.toPublicMeta(r)),
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
    return { ...this.toPublicMeta(row), body };
  }

  async create(input: {
    businessId: string;
    title: string;
    templateId: string;
  }): Promise<PublicDocumentDetail> {
    const title = this.validateTitle(input.title);
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
        status: PrismaDocumentStatus.draft,
      },
    });

    const body = createDocumentBodyFromTemplate({
      businessId: input.businessId,
      documentId: row.id,
      templateId,
      title,
      templateBody,
    });

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

    return { ...this.toPublicMeta(row), body };
  }

  async update(input: {
    businessId: string;
    documentId: string;
    title?: string;
    status?: string;
    body?: unknown;
  }): Promise<PublicDocumentDetail> {
    const row = await this.requireMeta(input.businessId, input.documentId);
    const data: {
      title?: string;
      status?: PrismaDocumentStatus;
    } = {};

    if (input.title !== undefined) {
      data.title = this.validateTitle(input.title);
    }
    if (input.status !== undefined) {
      data.status = this.requireStatus(input.status);
    }

    const updated =
      Object.keys(data).length > 0
        ? await this.prisma.document.update({
            where: { id: row.id },
            data,
          })
        : row;

    let body =
      (await this.bodies.find(input.businessId, input.documentId)) ??
      createEmptyDocumentBody(input.businessId, input.documentId, {
        title: updated.title,
        templateId: updated.templateId,
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
            updated.templateId,
          title:
            data.title ??
            (input.body as { title?: string }).title ??
            updated.title,
        });
      } catch (err) {
        this.rethrowBodyError(err);
      }
      for (const code of documentCollectRequiredModuleCodes(body)) {
        await this.entitlements.assertModule(
          input.businessId,
          code as EntitlementCode,
        );
      }
      try {
        await this.bodies.upsert(body);
      } catch {
        throw new DomainException(
          DocumentErrorCodes.StorageError,
          'Failed to store document body',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    } else if (data.title && body.title !== data.title) {
      body = { ...body, title: data.title };
      await this.bodies.upsert(body);
    }

    return { ...this.toPublicMeta(updated), body };
  }

  async softDelete(businessId: string, documentId: string): Promise<void> {
    await this.requireMeta(businessId, documentId);
    await this.prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });
    try {
      await this.bodies.delete(businessId, documentId);
    } catch {
      // PG soft-delete is list source of truth.
    }
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
    if (status === DocumentStatus.Draft) return PrismaDocumentStatus.draft;
    if (status === DocumentStatus.Published) {
      return PrismaDocumentStatus.published;
    }
    throw new DomainException(
      DocumentErrorCodes.InvalidStatus,
      'Document status is invalid',
      HttpStatus.BAD_REQUEST,
    );
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

  private toPublicMeta(row: PrismaDocument): PublicDocument {
    return {
      id: row.id,
      businessId: row.businessId,
      templateId: row.templateId,
      title: row.title,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
