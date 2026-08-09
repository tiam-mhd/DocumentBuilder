import { HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import { ZodError } from 'zod';
import type { DocumentTemplate } from '@prisma/client';
import {
  createEmptyTemplateBody,
  parseTemplateBody,
  CORE_BLOCK_REGISTRY,
  TEMPLATE_SCHEMA_VERSION,
  type TemplateBody,
} from '@vdb/document-schema';
import {
  TemplateErrorCodes,
  type PublicBlockRegistry,
  type PublicDocumentTemplate,
  type PublicDocumentTemplateDetail,
  type PublicDocumentTemplateList,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import { TemplateBodyRepository } from './template-body.repository';

@Injectable()
export class TemplateService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bodies: TemplateBodyRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.bodies.ensureIndexes();
    } catch {
      // Mongo may be down at boot — health endpoint reports separately.
    }
  }

  getRegistry(): PublicBlockRegistry {
    return {
      schemaVersion: TEMPLATE_SCHEMA_VERSION,
      items: CORE_BLOCK_REGISTRY.map((e) => ({
        type: e.type,
        labelKey: e.labelKey,
        allowsChildren: e.allowsChildren,
        moduleCode: e.moduleCode,
      })),
    };
  }

  async list(input: {
    businessId: string;
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<PublicDocumentTemplateList> {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(100, Math.max(1, input.pageSize));
    const q = input.q?.trim();
    const where = {
      businessId: input.businessId,
      deletedAt: null,
      ...(q
        ? {
            name: { contains: q, mode: 'insensitive' as const },
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.documentTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.documentTemplate.count({ where }),
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
    templateId: string,
  ): Promise<PublicDocumentTemplateDetail> {
    const row = await this.requireMeta(businessId, templateId);
    let body = await this.bodies.find(businessId, templateId);
    if (!body) {
      body = createEmptyTemplateBody(businessId, templateId);
      await this.bodies.upsert(body);
    }
    return { ...this.toPublicMeta(row), body };
  }

  async create(input: {
    businessId: string;
    name: string;
    description?: string | null;
    themeId?: string | null;
    body?: unknown;
  }): Promise<PublicDocumentTemplateDetail> {
    const name = this.validateName(input.name);
    const themeId = await this.resolveThemeId(
      input.businessId,
      input.themeId ?? null,
    );

    const row = await this.prisma.documentTemplate.create({
      data: {
        businessId: input.businessId,
        name,
        description: input.description?.trim() || null,
        themeId,
      },
    });

    let body: TemplateBody;
    try {
      if (input.body !== undefined) {
        body = parseTemplateBody({
          ...(input.body as object),
          businessId: input.businessId,
          templateId: row.id,
          schemaVersion: TEMPLATE_SCHEMA_VERSION,
        });
      } else {
        body = createEmptyTemplateBody(input.businessId, row.id);
      }
    } catch (err) {
      await this.prisma.documentTemplate.delete({ where: { id: row.id } });
      this.rethrowBodyError(err);
    }

    try {
      await this.bodies.upsert(body!);
    } catch {
      await this.prisma.documentTemplate.delete({ where: { id: row.id } });
      throw new DomainException(
        TemplateErrorCodes.StorageError,
        'Failed to store template body',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return { ...this.toPublicMeta(row), body: body! };
  }

  async update(input: {
    businessId: string;
    templateId: string;
    name?: string;
    description?: string | null;
    themeId?: string | null;
    body?: unknown;
  }): Promise<PublicDocumentTemplateDetail> {
    const row = await this.requireMeta(input.businessId, input.templateId);
    const data: {
      name?: string;
      description?: string | null;
      themeId?: string | null;
    } = {};

    if (input.name !== undefined) {
      data.name = this.validateName(input.name);
    }
    if (input.description !== undefined) {
      data.description = input.description?.trim() || null;
    }
    if (input.themeId !== undefined) {
      data.themeId = await this.resolveThemeId(
        input.businessId,
        input.themeId,
      );
    }

    const updated =
      Object.keys(data).length > 0
        ? await this.prisma.documentTemplate.update({
            where: { id: row.id },
            data,
          })
        : row;

    let body =
      (await this.bodies.find(input.businessId, input.templateId)) ??
      createEmptyTemplateBody(input.businessId, input.templateId);

    if (input.body !== undefined) {
      try {
        body = parseTemplateBody({
          ...(input.body as object),
          businessId: input.businessId,
          templateId: input.templateId,
          schemaVersion: TEMPLATE_SCHEMA_VERSION,
        });
      } catch (err) {
        this.rethrowBodyError(err);
      }
      try {
        await this.bodies.upsert(body);
      } catch {
        throw new DomainException(
          TemplateErrorCodes.StorageError,
          'Failed to store template body',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }

    return { ...this.toPublicMeta(updated), body };
  }

  async softDelete(businessId: string, templateId: string): Promise<void> {
    await this.requireMeta(businessId, templateId);
    await this.prisma.documentTemplate.update({
      where: { id: templateId },
      data: { deletedAt: new Date() },
    });
    try {
      await this.bodies.delete(businessId, templateId);
    } catch {
      // Soft-delete PG is source of truth for listing; Mongo cleanup best-effort.
    }
  }

  private async resolveThemeId(
    businessId: string,
    themeId: string | null,
  ): Promise<string | null> {
    if (!themeId) return null;
    const theme = await this.prisma.designTheme.findFirst({
      where: { id: themeId, businessId, deletedAt: null },
      select: { id: true },
    });
    if (!theme) {
      throw new DomainException(
        TemplateErrorCodes.ThemeNotFound,
        'Theme not found for this business',
        HttpStatus.BAD_REQUEST,
      );
    }
    return theme.id;
  }

  private async requireMeta(businessId: string, templateId: string) {
    const row = await this.prisma.documentTemplate.findFirst({
      where: { id: templateId, businessId, deletedAt: null },
    });
    if (!row) {
      throw new DomainException(
        TemplateErrorCodes.NotFound,
        'Template not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private validateName(name: string): string {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 120) {
      throw new DomainException(
        TemplateErrorCodes.InvalidName,
        'Template name is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }
    return trimmed;
  }

  private rethrowBodyError(err: unknown): never {
    if (err instanceof ZodError) {
      throw new DomainException(
        TemplateErrorCodes.InvalidBody,
        err.issues[0]?.message ?? 'Invalid template body',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (err instanceof DomainException) throw err;
    throw new DomainException(
      TemplateErrorCodes.InvalidBody,
      'Invalid template body',
      HttpStatus.BAD_REQUEST,
    );
  }

  private toPublicMeta(row: DocumentTemplate): PublicDocumentTemplate {
    return {
      id: row.id,
      businessId: row.businessId,
      themeId: row.themeId,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
