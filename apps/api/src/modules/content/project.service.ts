import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ProjectStatus as PrismaProjectStatus,
  Prisma,
  type Project,
  type ProjectCategory,
} from '@prisma/client';
import {
  asEntityTranslations,
  ProjectErrorCodes,
  ProjectStatus,
  type ProjectStatusValue,
  type PublicProject,
  type PublicProjectCategory,
  type PublicProjectCategoryList,
  type PublicProjectList,
} from '@vdb/shared-types';
import {
  parseTranslationsInput,
  translationsToJson,
} from '../../common/content-locale';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import { LocationService } from './location.service';

const CATEGORY_TRANSLATION_FIELDS = ['name'] as const;
const PROJECT_TRANSLATION_FIELDS = ['title', 'description'] as const;

const MAX_FIELDS_KEYS = 40;
const MAX_MEDIA_IDS = 40;
const MAX_FIELD_STRING = 4000;

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locations: LocationService,
  ) {}

  async listCategories(input: {
    businessId: string;
    page: number;
    pageSize: number;
  }): Promise<PublicProjectCategoryList> {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(100, Math.max(1, input.pageSize));
    const where = { businessId: input.businessId, deletedAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.projectCategory.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.projectCategory.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.toPublicCategory(r)),
      page,
      pageSize,
      total,
    };
  }

  async createCategory(input: {
    businessId: string;
    name: string;
    sortOrder?: number;
    translations?: Record<string, unknown>;
  }): Promise<PublicProjectCategory> {
    const name = input.name.trim();
    if (name.length < 1 || name.length > 120) {
      throw new DomainException(
        ProjectErrorCodes.InvalidTitle,
        'Category name is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }
    const row = await this.prisma.projectCategory.create({
      data: {
        businessId: input.businessId,
        name,
        sortOrder: input.sortOrder ?? 0,
        translations: translationsToJson(
          parseTranslationsInput(
            input.translations,
            CATEGORY_TRANSLATION_FIELDS,
          ),
        ),
      },
    });
    return this.toPublicCategory(row);
  }

  async updateCategory(input: {
    businessId: string;
    categoryId: string;
    name?: string;
    sortOrder?: number;
    translations?: Record<string, unknown>;
  }): Promise<PublicProjectCategory> {
    await this.requireCategory(input.businessId, input.categoryId);
    const data: Prisma.ProjectCategoryUpdateInput = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length < 1 || name.length > 120) {
        throw new DomainException(
          ProjectErrorCodes.InvalidTitle,
          'Category name is invalid',
          HttpStatus.BAD_REQUEST,
        );
      }
      data.name = name;
    }
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.translations !== undefined) {
      data.translations = translationsToJson(
        parseTranslationsInput(
          input.translations,
          CATEGORY_TRANSLATION_FIELDS,
        ),
      );
    }
    const row = await this.prisma.projectCategory.update({
      where: { id: input.categoryId },
      data,
    });
    return this.toPublicCategory(row);
  }

  async softDeleteCategory(
    businessId: string,
    categoryId: string,
  ): Promise<void> {
    await this.requireCategory(businessId, categoryId);
    const activeCount = await this.prisma.project.count({
      where: {
        businessId,
        categoryId,
        deletedAt: null,
      },
    });
    if (activeCount > 0) {
      throw new DomainException(
        ProjectErrorCodes.CategoryInUse,
        'Category still has projects',
        HttpStatus.CONFLICT,
      );
    }
    await this.prisma.projectCategory.update({
      where: { id: categoryId },
      data: { deletedAt: new Date() },
    });
  }

  async list(input: {
    businessId: string;
    page: number;
    pageSize: number;
    q?: string;
    status?: string;
    categoryId?: string;
  }): Promise<PublicProjectList> {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(100, Math.max(1, input.pageSize));
    const where: {
      businessId: string;
      deletedAt: null;
      status?: PrismaProjectStatus;
      categoryId?: string;
      OR?: Array<{ title: { contains: string; mode: 'insensitive' } } | { description: { contains: string; mode: 'insensitive' } }>;
    } = {
      businessId: input.businessId,
      deletedAt: null,
    };
    if (input.status) {
      where.status = this.parseStatus(input.status);
    }
    if (input.categoryId) {
      where.categoryId = input.categoryId;
    }
    const q = input.q?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: { category: true, location: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.project.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.toPublic(r)),
      page,
      pageSize,
      total,
    };
  }

  async get(businessId: string, projectId: string): Promise<PublicProject> {
    const row = await this.requireProject(businessId, projectId);
    return this.toPublic(row);
  }

  async create(input: {
    businessId: string;
    title: string;
    description?: string;
    categoryId?: string | null;
    status?: string;
    coverMediaId?: string | null;
    mediaIds?: string[];
    locationId?: string | null;
    fields?: Record<string, unknown>;
    translations?: Record<string, unknown>;
  }): Promise<PublicProject> {
    const title = input.title.trim();
    if (title.length < 1 || title.length > 200) {
      throw new DomainException(
        ProjectErrorCodes.InvalidTitle,
        'Project title is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }
    const categoryId = await this.resolveCategoryId(
      input.businessId,
      input.categoryId,
    );
    const mediaIds = await this.resolveMediaIds(
      input.businessId,
      input.mediaIds ?? [],
      input.coverMediaId,
    );
    const coverMediaId = await this.resolveOptionalMedia(
      input.businessId,
      input.coverMediaId,
    );
    const status = input.status
      ? this.parseStatus(input.status)
      : PrismaProjectStatus.draft;
    const fields = this.normalizeFields(input.fields ?? {});
    const locationId = await this.locations.resolveOptionalId(
      input.businessId,
      input.locationId,
    );
    const row = await this.prisma.project.create({
      data: {
        businessId: input.businessId,
        title,
        description: (input.description ?? '').trim().slice(0, 5000),
        categoryId,
        status,
        coverMediaId,
        mediaIds: mediaIds as Prisma.InputJsonValue,
        locationId,
        fields: fields as Prisma.InputJsonValue,
        translations: translationsToJson(
          parseTranslationsInput(
            input.translations,
            PROJECT_TRANSLATION_FIELDS,
          ),
        ),
      },
      include: { category: true, location: true },
    });
    return this.toPublic(row);
  }

  async update(input: {
    businessId: string;
    projectId: string;
    title?: string;
    description?: string;
    categoryId?: string | null;
    status?: string;
    coverMediaId?: string | null;
    mediaIds?: string[];
    locationId?: string | null;
    fields?: Record<string, unknown>;
    translations?: Record<string, unknown>;
  }): Promise<PublicProject> {
    await this.requireProject(input.businessId, input.projectId);
    const data: Prisma.ProjectUpdateInput = {};
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (title.length < 1 || title.length > 200) {
        throw new DomainException(
          ProjectErrorCodes.InvalidTitle,
          'Project title is invalid',
          HttpStatus.BAD_REQUEST,
        );
      }
      data.title = title;
    }
    if (input.description !== undefined) {
      data.description = input.description.trim().slice(0, 5000);
    }
    if (input.categoryId !== undefined) {
      const resolved = await this.resolveCategoryId(
        input.businessId,
        input.categoryId,
      );
      data.category = resolved
        ? { connect: { id: resolved } }
        : { disconnect: true };
    }
    if (input.status !== undefined) {
      data.status = this.parseStatus(input.status);
    }
    if (input.coverMediaId !== undefined) {
      data.coverMediaId = await this.resolveOptionalMedia(
        input.businessId,
        input.coverMediaId,
      );
    }
    if (input.mediaIds !== undefined || input.coverMediaId !== undefined) {
      const existing = await this.requireProject(
        input.businessId,
        input.projectId,
      );
      const nextMedia =
        input.mediaIds ?? this.asStringArray(existing.mediaIds);
      const nextCover =
        input.coverMediaId !== undefined
          ? input.coverMediaId
          : existing.coverMediaId;
      data.mediaIds = (await this.resolveMediaIds(
        input.businessId,
        nextMedia,
        nextCover,
      )) as Prisma.InputJsonValue;
      if (input.coverMediaId !== undefined) {
        data.coverMediaId = await this.resolveOptionalMedia(
          input.businessId,
          input.coverMediaId,
        );
      }
    }
    if (input.locationId !== undefined) {
      const resolved = await this.locations.resolveOptionalId(
        input.businessId,
        input.locationId,
      );
      data.location = resolved
        ? { connect: { id: resolved } }
        : { disconnect: true };
    }
    if (input.fields !== undefined) {
      data.fields = this.normalizeFields(
        input.fields,
      ) as Prisma.InputJsonValue;
    }
    if (input.translations !== undefined) {
      data.translations = translationsToJson(
        parseTranslationsInput(
          input.translations,
          PROJECT_TRANSLATION_FIELDS,
        ),
      );
    }
    const row = await this.prisma.project.update({
      where: { id: input.projectId },
      data,
      include: { category: true, location: true },
    });
    return this.toPublic(row);
  }

  async softDelete(businessId: string, projectId: string): Promise<void> {
    await this.requireProject(businessId, projectId);
    await this.prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });
  }

  private async requireCategory(businessId: string, categoryId: string) {
    const row = await this.prisma.projectCategory.findFirst({
      where: { id: categoryId, businessId, deletedAt: null },
    });
    if (!row) {
      throw new DomainException(
        ProjectErrorCodes.CategoryNotFound,
        'Project category not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private async requireProject(businessId: string, projectId: string) {
    const row = await this.prisma.project.findFirst({
      where: { id: projectId, businessId, deletedAt: null },
      include: { category: true, location: true },
    });
    if (!row) {
      throw new DomainException(
        ProjectErrorCodes.NotFound,
        'Project not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private async resolveCategoryId(
    businessId: string,
    categoryId: string | null | undefined,
  ): Promise<string | null> {
    if (categoryId === undefined || categoryId === null || categoryId === '') {
      return null;
    }
    await this.requireCategory(businessId, categoryId);
    return categoryId;
  }

  private async resolveOptionalMedia(
    businessId: string,
    mediaId: string | null | undefined,
  ): Promise<string | null> {
    if (mediaId === undefined || mediaId === null || mediaId === '') {
      return null;
    }
    await this.assertMedia(businessId, mediaId);
    return mediaId;
  }

  private async resolveMediaIds(
    businessId: string,
    mediaIds: string[],
    coverMediaId?: string | null,
  ): Promise<string[]> {
    const unique = Array.from(
      new Set(
        [...mediaIds, coverMediaId]
          .filter((id): id is string => Boolean(id && id.trim()))
          .map((id) => id.trim()),
      ),
    );
    if (unique.length > MAX_MEDIA_IDS) {
      throw new DomainException(
        ProjectErrorCodes.InvalidFields,
        'Too many media refs',
        HttpStatus.BAD_REQUEST,
      );
    }
    for (const id of unique) {
      await this.assertMedia(businessId, id);
    }
    return unique;
  }

  private async assertMedia(businessId: string, mediaId: string) {
    const row = await this.prisma.mediaAsset.findFirst({
      where: { id: mediaId, businessId, deletedAt: null },
      select: { id: true },
    });
    if (!row) {
      throw new DomainException(
        ProjectErrorCodes.MediaNotFound,
        'Media asset not found for this business',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private parseStatus(raw: string): PrismaProjectStatus {
    const allowed = Object.values(ProjectStatus) as string[];
    if (!allowed.includes(raw)) {
      throw new DomainException(
        ProjectErrorCodes.InvalidStatus,
        'Invalid project status',
        HttpStatus.BAD_REQUEST,
      );
    }
    return raw as PrismaProjectStatus;
  }

  private normalizeFields(
    fields: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
      throw new DomainException(
        ProjectErrorCodes.InvalidFields,
        'fields must be an object',
        HttpStatus.BAD_REQUEST,
      );
    }
    const keys = Object.keys(fields);
    if (keys.length > MAX_FIELDS_KEYS) {
      throw new DomainException(
        ProjectErrorCodes.InvalidFields,
        'Too many field keys',
        HttpStatus.BAD_REQUEST,
      );
    }
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key)) {
        throw new DomainException(
          ProjectErrorCodes.InvalidFields,
          `Invalid field key: ${key}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      const value = fields[key];
      if (
        value === null ||
        typeof value === 'boolean' ||
        typeof value === 'number'
      ) {
        out[key] = value;
      } else if (typeof value === 'string') {
        out[key] = value.slice(0, MAX_FIELD_STRING);
      } else {
        throw new DomainException(
          ProjectErrorCodes.InvalidFields,
          `Unsupported field type for ${key}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    return out;
  }

  private asStringArray(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((x): x is string => typeof x === 'string');
  }

  private toPublicCategory(row: ProjectCategory): PublicProjectCategory {
    return {
      id: row.id,
      businessId: row.businessId,
      name: row.name,
      translations: asEntityTranslations(row.translations),
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toPublic(
    row: Project & {
      category?: ProjectCategory | null;
      location?: { name: string } | null;
    },
  ): PublicProject {
    return {
      id: row.id,
      businessId: row.businessId,
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? null,
      title: row.title,
      description: row.description,
      translations: asEntityTranslations(row.translations),
      status: row.status as ProjectStatusValue,
      coverMediaId: row.coverMediaId,
      mediaIds: this.asStringArray(row.mediaIds),
      locationId: row.locationId,
      locationName: row.location?.name ?? null,
      fields:
        row.fields &&
        typeof row.fields === 'object' &&
        !Array.isArray(row.fields)
          ? (row.fields as Record<string, unknown>)
          : {},
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
