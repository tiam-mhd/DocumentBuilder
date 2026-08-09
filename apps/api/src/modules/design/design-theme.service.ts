import { createHash } from 'crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { DesignTheme, Prisma } from '@prisma/client';
import {
  DEFAULT_DESIGN_THEME_NAME,
  DEFAULT_DESIGN_THEME_TOKENS,
  DesignThemeErrorCodes,
  type DesignThemeTokens,
  type PublicDesignTheme,
  type PublicDesignThemeList,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const WEIGHTS = new Set([100, 200, 300, 400, 500, 600, 700, 800, 900]);

@Injectable()
export class DesignThemeService {
  constructor(private readonly prisma: PrismaService) {}

  /** Seed default theme inside Business-create transaction. */
  async seedDefaultInTx(
    tx: Prisma.TransactionClient,
    businessId: string,
  ): Promise<void> {
    await tx.designTheme.create({
      data: {
        businessId,
        name: DEFAULT_DESIGN_THEME_NAME,
        isDefault: true,
        tokens: DEFAULT_DESIGN_THEME_TOKENS as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /** Lazy create for businesses created before this feature. */
  async ensureDefault(businessId: string): Promise<PublicDesignTheme> {
    const existing = await this.prisma.designTheme.findFirst({
      where: { businessId, deletedAt: null, isDefault: true },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return this.toPublic(existing);

    const any = await this.prisma.designTheme.findFirst({
      where: { businessId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (any) {
      const updated = await this.prisma.designTheme.update({
        where: { id: any.id },
        data: { isDefault: true },
      });
      return this.toPublic(updated);
    }

    const created = await this.prisma.designTheme.create({
      data: {
        businessId,
        name: DEFAULT_DESIGN_THEME_NAME,
        isDefault: true,
        tokens: DEFAULT_DESIGN_THEME_TOKENS as unknown as Prisma.InputJsonValue,
      },
    });
    return this.toPublic(created);
  }

  async list(input: {
    businessId: string;
    page: number;
    pageSize: number;
  }): Promise<PublicDesignThemeList> {
    await this.ensureDefault(input.businessId);
    const page = Math.max(1, input.page);
    const pageSize = Math.min(100, Math.max(1, input.pageSize));
    const where = { businessId: input.businessId, deletedAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.designTheme.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.designTheme.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.toPublic(r)),
      page,
      pageSize,
      total,
    };
  }

  async get(businessId: string, themeId: string): Promise<PublicDesignTheme> {
    const row = await this.requireTheme(businessId, themeId);
    return this.toPublic(row);
  }

  async getDefault(businessId: string): Promise<PublicDesignTheme> {
    return this.ensureDefault(businessId);
  }

  async create(input: {
    businessId: string;
    name: string;
    tokens?: DesignThemeTokens;
    makeDefault?: boolean;
  }): Promise<PublicDesignTheme> {
    const name = this.validateName(input.name);
    const tokens = this.normalizeTokens(
      input.tokens ?? DEFAULT_DESIGN_THEME_TOKENS,
    );
    await this.assertFontRefs(input.businessId, tokens);

    const makeDefault = Boolean(input.makeDefault);
    const created = await this.prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.designTheme.updateMany({
          where: { businessId: input.businessId, deletedAt: null, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.designTheme.create({
        data: {
          businessId: input.businessId,
          name,
          isDefault: makeDefault,
          tokens: tokens as unknown as Prisma.InputJsonValue,
        },
      });
    });

    if (!makeDefault) {
      await this.ensureDefault(input.businessId);
    }
    return this.toPublic(created);
  }

  async update(input: {
    businessId: string;
    themeId: string;
    name?: string;
    tokens?: DesignThemeTokens;
  }): Promise<PublicDesignTheme> {
    await this.requireTheme(input.businessId, input.themeId);
    const data: Prisma.DesignThemeUpdateInput = {};
    if (input.name !== undefined) {
      data.name = this.validateName(input.name);
    }
    if (input.tokens !== undefined) {
      const tokens = this.normalizeTokens(input.tokens);
      await this.assertFontRefs(input.businessId, tokens);
      data.tokens = tokens as unknown as Prisma.InputJsonValue;
    }
    if (Object.keys(data).length === 0) {
      return this.get(input.businessId, input.themeId);
    }
    const updated = await this.prisma.designTheme.update({
      where: { id: input.themeId },
      data,
    });
    return this.toPublic(updated);
  }

  async setDefault(businessId: string, themeId: string): Promise<PublicDesignTheme> {
    await this.requireTheme(businessId, themeId);
    await this.prisma.$transaction(async (tx) => {
      await tx.designTheme.updateMany({
        where: { businessId, deletedAt: null, isDefault: true },
        data: { isDefault: false },
      });
      await tx.designTheme.update({
        where: { id: themeId },
        data: { isDefault: true },
      });
    });
    return this.get(businessId, themeId);
  }

  async softDelete(businessId: string, themeId: string): Promise<void> {
    const row = await this.requireTheme(businessId, themeId);
    if (row.isDefault) {
      throw new DomainException(
        DesignThemeErrorCodes.CannotDeleteDefault,
        'Cannot delete the default theme; set another default first',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.prisma.designTheme.update({
      where: { id: themeId },
      data: { deletedAt: new Date() },
    });
  }

  normalizeTokens(raw: unknown): DesignThemeTokens {
    if (!raw || typeof raw !== 'object') {
      throw new DomainException(
        DesignThemeErrorCodes.InvalidTokens,
        'Theme tokens are invalid',
        HttpStatus.BAD_REQUEST,
      );
    }
    const obj = raw as Record<string, unknown>;
    const colors = obj.colors as Record<string, unknown> | undefined;
    const typography = obj.typography as Record<string, unknown> | undefined;
    const fonts = (obj.fonts as Record<string, unknown> | undefined) ?? {};

    if (!colors || !typography) {
      throw new DomainException(
        DesignThemeErrorCodes.InvalidTokens,
        'Theme tokens require colors and typography',
        HttpStatus.BAD_REQUEST,
      );
    }

    const tokens: DesignThemeTokens = {
      colors: {
        primary: this.requireHex(colors.primary, 'colors.primary'),
        secondary: this.requireHex(colors.secondary, 'colors.secondary'),
        text: this.requireHex(colors.text, 'colors.text'),
        background: this.requireHex(colors.background, 'colors.background'),
      },
      typography: {
        headingFamily: this.requireFamily(
          typography.headingFamily,
          'typography.headingFamily',
        ),
        bodyFamily: this.requireFamily(
          typography.bodyFamily,
          'typography.bodyFamily',
        ),
        headingWeight: this.requireWeight(
          typography.headingWeight,
          'typography.headingWeight',
        ),
        bodyWeight: this.requireWeight(
          typography.bodyWeight,
          'typography.bodyWeight',
        ),
        baseSizePx: this.requireBaseSize(typography.baseSizePx),
      },
      fonts: {
        headingFontFaceId: this.optionalId(fonts.headingFontFaceId),
        bodyFontFaceId: this.optionalId(fonts.bodyFontFaceId),
      },
    };
    return tokens;
  }

  private async assertFontRefs(
    businessId: string,
    tokens: DesignThemeTokens,
  ): Promise<void> {
    const ids = [
      tokens.fonts.headingFontFaceId,
      tokens.fonts.bodyFontFaceId,
    ].filter((id): id is string => Boolean(id));
    for (const id of ids) {
      const face = await this.prisma.fontFace.findFirst({
        where: { id, businessId, deletedAt: null },
        select: { id: true, family: true, weight: true },
      });
      if (!face) {
        throw new DomainException(
          DesignThemeErrorCodes.FontNotFound,
          'Referenced font face not found in this business',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  private async requireTheme(businessId: string, themeId: string) {
    const row = await this.prisma.designTheme.findFirst({
      where: { id: themeId, businessId, deletedAt: null },
    });
    if (!row) {
      throw new DomainException(
        DesignThemeErrorCodes.NotFound,
        'Theme not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private validateName(name: string): string {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 80) {
      throw new DomainException(
        DesignThemeErrorCodes.InvalidName,
        'Theme name is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }
    return trimmed;
  }

  private requireHex(value: unknown, field: string): string {
    if (typeof value !== 'string' || !HEX_COLOR.test(value.trim())) {
      throw new DomainException(
        DesignThemeErrorCodes.InvalidTokens,
        `Invalid color for ${field}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return value.trim().toUpperCase();
  }

  private requireFamily(value: unknown, field: string): string {
    if (typeof value !== 'string') {
      throw new DomainException(
        DesignThemeErrorCodes.InvalidTokens,
        `Invalid family for ${field}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 120) {
      throw new DomainException(
        DesignThemeErrorCodes.InvalidTokens,
        `Invalid family for ${field}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return trimmed;
  }

  private requireWeight(value: unknown, field: string): number {
    const n = typeof value === 'number' ? value : Number(value);
    if (!WEIGHTS.has(n)) {
      throw new DomainException(
        DesignThemeErrorCodes.InvalidTokens,
        `Invalid weight for ${field}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return n;
  }

  private requireBaseSize(value: unknown): number {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || n < 10 || n > 32) {
      throw new DomainException(
        DesignThemeErrorCodes.InvalidTokens,
        'baseSizePx must be between 10 and 32',
        HttpStatus.BAD_REQUEST,
      );
    }
    return Math.round(n);
  }

  private optionalId(value: unknown): string | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'string' || value.length > 64) {
      throw new DomainException(
        DesignThemeErrorCodes.InvalidTokens,
        'Invalid font face id',
        HttpStatus.BAD_REQUEST,
      );
    }
    return value;
  }

  private toPublic(row: DesignTheme): PublicDesignTheme {
    return {
      id: row.id,
      businessId: row.businessId,
      name: row.name,
      isDefault: row.isDefault,
      tokens: this.normalizeTokens(row.tokens),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

/** Stable id helper for tests — unused in production path. */
export function themeTokensFingerprint(tokens: DesignThemeTokens): string {
  return createHash('sha1').update(JSON.stringify(tokens)).digest('hex');
}
