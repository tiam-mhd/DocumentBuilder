import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { FontStyle as PrismaFontStyle, type FontFace } from '@prisma/client';
import {
  FontErrorCodes,
  type PublicFontFace,
  type PublicFontList,
} from '@vdb/shared-types';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import {
  OBJECT_STORAGE,
  type ObjectStorage,
} from './storage/object-storage.port';

const EXT_MIME: Record<string, string> = {
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
};

const ALLOWED_MIME = new Set([
  'font/woff2',
  'font/ttf',
  'font/otf',
  'application/font-woff2',
  'application/x-font-ttf',
  'application/x-font-otf',
  'application/octet-stream', // browsers sometimes send this; we still check extension
]);

@Injectable()
export class FontService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  private resolveExt(file: {
    originalname: string;
    mimetype: string;
  }): 'woff2' | 'ttf' | 'otf' | null {
    const fromName = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (fromName === 'woff2' || fromName === 'ttf' || fromName === 'otf') {
      return fromName;
    }
    const mime = (file.mimetype || '').toLowerCase();
    if (mime.includes('woff2')) return 'woff2';
    if (mime.includes('ttf') || mime.includes('truetype')) return 'ttf';
    if (mime.includes('otf') || mime.includes('opentype')) return 'otf';
    return null;
  }

  validateUpload(
    file: { originalname: string; mimetype: string; size: number },
    maxBytes: number,
  ): 'woff2' | 'ttf' | 'otf' {
    const ext = this.resolveExt(file);
    if (!ext) {
      throw new DomainException(
        FontErrorCodes.InvalidType,
        'Only woff2, ttf, and otf fonts are allowed',
        HttpStatus.BAD_REQUEST,
      );
    }
    const mime = (file.mimetype || '').toLowerCase();
    if (mime && !ALLOWED_MIME.has(mime) && mime !== `font/${ext}`) {
      // still allow if extension is valid (some UAs send weird MIME)
      if (!mime.includes(ext) && mime !== 'application/octet-stream') {
        throw new DomainException(
          FontErrorCodes.InvalidType,
          `MIME type not allowed: ${mime}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    if (file.size > maxBytes) {
      throw new DomainException(
        FontErrorCodes.TooLarge,
        `File exceeds max size of ${maxBytes} bytes`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return ext;
  }

  private normalizeFamily(family: string): string {
    const trimmed = family.trim().replace(/\s+/g, ' ');
    if (trimmed.length < 1 || trimmed.length > 80) {
      throw new DomainException(
        FontErrorCodes.InvalidFamily,
        'Font family must be 1–80 characters',
        HttpStatus.BAD_REQUEST,
      );
    }
    return trimmed;
  }

  private normalizeWeight(weight: number): number {
    if (!Number.isInteger(weight) || weight < 100 || weight > 900 || weight % 100 !== 0) {
      throw new DomainException(
        FontErrorCodes.InvalidWeight,
        'Font weight must be 100–900 in steps of 100',
        HttpStatus.BAD_REQUEST,
      );
    }
    return weight;
  }

  async upload(input: {
    businessId: string;
    file: Express.Multer.File;
    family: string;
    weight: number;
    style: 'normal' | 'italic';
    maxBytes: number;
  }): Promise<PublicFontFace> {
    if (!input.file?.buffer?.length) {
      throw new DomainException(
        FontErrorCodes.UploadFailed,
        'Empty upload',
        HttpStatus.BAD_REQUEST,
      );
    }
    const ext = this.validateUpload(input.file, input.maxBytes);
    const family = this.normalizeFamily(input.family);
    const weight = this.normalizeWeight(input.weight);
    const style =
      input.style === 'italic' ? PrismaFontStyle.italic : PrismaFontStyle.normal;

    const duplicate = await this.prisma.fontFace.findFirst({
      where: {
        businessId: input.businessId,
        family,
        weight,
        style,
        deletedAt: null,
      },
    });
    if (duplicate) {
      throw new DomainException(
        FontErrorCodes.Duplicate,
        'A font face with this family/weight/style already exists',
        HttpStatus.CONFLICT,
      );
    }

    const fontId = randomUUID().replace(/-/g, '').slice(0, 24);
    const storageKey = `${input.businessId}/fonts/${fontId}/original.${ext}`;
    const mimeType = EXT_MIME[ext];

    try {
      await this.storage.put(storageKey, input.file.buffer, mimeType);
    } catch (err) {
      throw new DomainException(
        FontErrorCodes.UploadFailed,
        err instanceof Error ? err.message : 'Font storage failed',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const row = await this.prisma.fontFace.create({
      data: {
        id: fontId,
        businessId: input.businessId,
        family,
        weight,
        style,
        originalName: path.basename(input.file.originalname).slice(0, 255),
        mimeType,
        byteSize: input.file.size,
        storageKey,
      },
    });

    return this.toPublic(row);
  }

  async list(input: {
    businessId: string;
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<PublicFontList> {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(100, Math.max(1, input.pageSize));
    const where = {
      businessId: input.businessId,
      deletedAt: null,
      ...(input.q?.trim()
        ? {
            family: {
              contains: input.q.trim(),
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.fontFace.count({ where }),
      this.prisma.fontFace.findMany({
        where,
        orderBy: [{ family: 'asc' }, { weight: 'asc' }, { style: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      items: rows.map((r) => this.toPublic(r)),
      page,
      pageSize,
      total,
    };
  }

  async get(businessId: string, fontId: string): Promise<PublicFontFace> {
    return this.toPublic(await this.findActive(businessId, fontId));
  }

  async softDelete(businessId: string, fontId: string): Promise<void> {
    const row = await this.findActive(businessId, fontId);
    await this.prisma.fontFace.update({
      where: { id: row.id },
      data: { deletedAt: new Date() },
    });
    await this.storage.delete(row.storageKey);
  }

  async readFile(
    businessId: string,
    fontId: string,
  ): Promise<{ body: Buffer; contentType: string; filename: string; storageKey: string }> {
    const row = await this.findActive(businessId, fontId);
    const obj = await this.storage.get(row.storageKey);
    if (!obj) {
      throw new DomainException(
        FontErrorCodes.StorageError,
        'Font object missing from storage',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      body: obj.body,
      contentType: row.mimeType || obj.contentType,
      filename: row.originalName,
      storageKey: row.storageKey,
    };
  }

  private async findActive(businessId: string, fontId: string) {
    const row = await this.prisma.fontFace.findFirst({
      where: { id: fontId, businessId, deletedAt: null },
    });
    if (!row) {
      throw new DomainException(
        FontErrorCodes.NotFound,
        'Font face not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private toPublic(row: FontFace): PublicFontFace {
    return {
      id: row.id,
      businessId: row.businessId,
      family: row.family,
      weight: row.weight,
      style: row.style,
      originalName: row.originalName,
      mimeType: row.mimeType,
      byteSize: row.byteSize,
      storageKey: row.storageKey,
      createdAt: row.createdAt.toISOString(),
      fileUrl: `/businesses/${row.businessId}/fonts/${row.id}/file`,
    };
  }
}
