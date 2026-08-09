import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { MediaAssetStatus, type MediaAsset } from '@prisma/client';
import {
  MediaErrorCodes,
  type MediaVariant,
  type PublicMediaAsset,
  type PublicMediaList,
} from '@vdb/shared-types';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import { ImageDerivativeService } from './image-derivative.service';
import {
  OBJECT_STORAGE,
  type ObjectStorage,
} from './storage/object-storage.port';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    private readonly derivatives: ImageDerivativeService,
  ) {}

  validateUpload(
    file: {
      mimetype: string;
      size: number;
      originalname: string;
    },
    maxBytes: number,
  ): void {
    const mime = (file.mimetype || '').toLowerCase();
    if (
      mime === 'image/svg+xml' ||
      file.originalname.toLowerCase().endsWith('.svg')
    ) {
      throw new DomainException(
        MediaErrorCodes.SvgForbidden,
        'SVG uploads are not allowed',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!ALLOWED_MIME.has(mime)) {
      throw new DomainException(
        MediaErrorCodes.InvalidType,
        `MIME type not allowed: ${mime}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (file.size > maxBytes) {
      throw new DomainException(
        MediaErrorCodes.TooLarge,
        `File exceeds max size of ${maxBytes} bytes`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async upload(input: {
    businessId: string;
    file: Express.Multer.File;
    maxBytes: number;
  }): Promise<PublicMediaAsset> {
    if (!input.file?.buffer?.length) {
      throw new DomainException(
        MediaErrorCodes.UploadFailed,
        'Empty upload',
        HttpStatus.BAD_REQUEST,
      );
    }
    this.validateUpload(input.file, input.maxBytes);

    const assetId = randomUUID().replace(/-/g, '').slice(0, 24);
    const ext = EXT_BY_MIME[input.file.mimetype] ?? 'bin';
    const base = `${input.businessId}/media/${assetId}`;
    const originalKey = `${base}/original.${ext}`;

    let width: number | null = null;
    let height: number | null = null;
    let thumbKey: string | null = null;
    let webKey: string | null = null;
    let printKey: string | null = null;

    try {
      await this.storage.put(
        originalKey,
        input.file.buffer,
        input.file.mimetype,
      );

      const built = await this.derivatives.build(input.file.buffer);
      width = built.width || null;
      height = built.height || null;
      thumbKey = `${base}/thumb.${built.thumb.ext}`;
      webKey = `${base}/web.${built.web.ext}`;
      printKey = `${base}/print.${built.print.ext}`;
      await this.storage.put(
        thumbKey,
        built.thumb.buffer,
        built.thumb.contentType,
      );
      await this.storage.put(webKey, built.web.buffer, built.web.contentType);
      await this.storage.put(
        printKey,
        built.print.buffer,
        built.print.contentType,
      );
    } catch (err) {
      if (err instanceof DomainException) throw err;
      throw new DomainException(
        MediaErrorCodes.UploadFailed,
        err instanceof Error ? err.message : 'Upload processing failed',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const row = await this.prisma.mediaAsset.create({
      data: {
        id: assetId,
        businessId: input.businessId,
        originalName: path.basename(input.file.originalname).slice(0, 255),
        mimeType: input.file.mimetype,
        byteSize: input.file.size,
        width,
        height,
        storageKey: originalKey,
        thumbKey,
        webKey,
        printKey,
        status: MediaAssetStatus.ready,
        meta: { driver: this.storage.driver },
      },
    });

    return this.toPublic(row);
  }

  async list(input: {
    businessId: string;
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<PublicMediaList> {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(50, Math.max(1, input.pageSize));
    const where = {
      businessId: input.businessId,
      deletedAt: null,
      ...(input.q?.trim()
        ? {
            originalName: {
              contains: input.q.trim(),
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.mediaAsset.count({ where }),
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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

  async get(businessId: string, assetId: string): Promise<PublicMediaAsset> {
    const row = await this.findActive(businessId, assetId);
    return this.toPublic(row);
  }

  async softDelete(businessId: string, assetId: string): Promise<void> {
    const row = await this.findActive(businessId, assetId);
    await this.prisma.mediaAsset.update({
      where: { id: row.id },
      data: { deletedAt: new Date() },
    });
    const keys = [row.storageKey, row.thumbKey, row.webKey, row.printKey].filter(
      Boolean,
    ) as string[];
    await Promise.all(keys.map((k) => this.storage.delete(k)));
  }

  async readVariant(
    businessId: string,
    assetId: string,
    variant: MediaVariant,
  ): Promise<{ body: Buffer; contentType: string; filename: string }> {
    const row = await this.findActive(businessId, assetId);
    const key =
      variant === 'thumb'
        ? row.thumbKey
        : variant === 'web'
          ? row.webKey
          : variant === 'print'
            ? row.printKey
            : row.storageKey;
    if (!key) {
      throw new DomainException(
        MediaErrorCodes.NotFound,
        `Variant ${variant} not available`,
        HttpStatus.NOT_FOUND,
      );
    }
    const obj = await this.storage.get(key);
    if (!obj) {
      throw new DomainException(
        MediaErrorCodes.StorageError,
        'Object missing from storage',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      body: obj.body,
      contentType: obj.contentType,
      filename: `${row.originalName}.${variant}`,
    };
  }

  private async findActive(businessId: string, assetId: string) {
    const row = await this.prisma.mediaAsset.findFirst({
      where: { id: assetId, businessId, deletedAt: null },
    });
    if (!row) {
      throw new DomainException(
        MediaErrorCodes.NotFound,
        'Media asset not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private toPublic(row: MediaAsset): PublicMediaAsset {
    const base = `/businesses/${row.businessId}/media/${row.id}/file`;
    return {
      id: row.id,
      businessId: row.businessId,
      originalName: row.originalName,
      mimeType: row.mimeType,
      byteSize: row.byteSize,
      width: row.width,
      height: row.height,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      urls: {
        original: `${base}?variant=original`,
        thumb: row.thumbKey ? `${base}?variant=thumb` : null,
        web: row.webKey ? `${base}?variant=web` : null,
        print: row.printKey ? `${base}?variant=print` : null,
      },
    };
  }
}
