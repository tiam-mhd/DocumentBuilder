import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, type Gallery, type GalleryItem } from '@prisma/client';
import {
  GalleryErrorCodes,
  type PublicGallery,
  type PublicGalleryItem,
  type PublicGalleryList,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';

const MAX_DESCRIPTION = 4000;
const MAX_CAPTION = 500;

@Injectable()
export class GalleryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: {
    businessId: string;
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<PublicGalleryList> {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(100, Math.max(1, input.pageSize));
    const where: Prisma.GalleryWhereInput = {
      businessId: input.businessId,
      deletedAt: null,
    };
    const q = input.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.gallery.findMany({
        where,
        include: {
          _count: { select: { items: { where: { deletedAt: null } } } },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.gallery.count({ where }),
    ]);
    return {
      items: rows.map((r) =>
        this.toPublicGallery(r, r._count.items, undefined),
      ),
      page,
      pageSize,
      total,
    };
  }

  async get(
    businessId: string,
    galleryId: string,
  ): Promise<PublicGallery> {
    const row = await this.requireGalleryWithItems(businessId, galleryId);
    return this.toPublicGallery(row, row.items.length, row.items);
  }

  async create(input: {
    businessId: string;
    name: string;
    description?: string;
    sortOrder?: number;
  }): Promise<PublicGallery> {
    const name = this.requireName(input.name);
    const row = await this.prisma.gallery.create({
      data: {
        businessId: input.businessId,
        name,
        description: (input.description ?? '').trim().slice(0, MAX_DESCRIPTION),
        sortOrder: input.sortOrder ?? 0,
      },
    });
    return this.toPublicGallery(row, 0, []);
  }

  async update(input: {
    businessId: string;
    galleryId: string;
    name?: string;
    description?: string;
    sortOrder?: number;
  }): Promise<PublicGallery> {
    await this.requireGallery(input.businessId, input.galleryId);
    const data: Prisma.GalleryUpdateInput = {};
    if (input.name !== undefined) data.name = this.requireName(input.name);
    if (input.description !== undefined) {
      data.description = input.description.trim().slice(0, MAX_DESCRIPTION);
    }
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    const row = await this.prisma.gallery.update({
      where: { id: input.galleryId },
      data,
      include: {
        _count: { select: { items: { where: { deletedAt: null } } } },
      },
    });
    return this.toPublicGallery(row, row._count.items, undefined);
  }

  async softDelete(businessId: string, galleryId: string): Promise<void> {
    await this.requireGallery(businessId, galleryId);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.galleryItem.updateMany({
        where: { businessId, galleryId, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.gallery.update({
        where: { id: galleryId },
        data: { deletedAt: now },
      }),
    ]);
  }

  async addItem(input: {
    businessId: string;
    galleryId: string;
    mediaId: string;
    caption?: string;
    sortOrder?: number;
  }): Promise<PublicGalleryItem> {
    await this.requireGallery(input.businessId, input.galleryId);
    const mediaId = await this.resolveMedia(input.businessId, input.mediaId);
    const caption = this.normalizeCaption(input.caption ?? '');
    let sortOrder = input.sortOrder;
    if (sortOrder === undefined) {
      const agg = await this.prisma.galleryItem.aggregate({
        where: {
          businessId: input.businessId,
          galleryId: input.galleryId,
          deletedAt: null,
        },
        _max: { sortOrder: true },
      });
      sortOrder = (agg._max.sortOrder ?? -1) + 1;
    }
    const row = await this.prisma.galleryItem.create({
      data: {
        businessId: input.businessId,
        galleryId: input.galleryId,
        mediaId,
        caption,
        sortOrder,
      },
    });
    return this.toPublicItem(row);
  }

  async updateItem(input: {
    businessId: string;
    galleryId: string;
    itemId: string;
    mediaId?: string;
    caption?: string;
    sortOrder?: number;
  }): Promise<PublicGalleryItem> {
    await this.requireItem(input.businessId, input.galleryId, input.itemId);
    const data: Prisma.GalleryItemUpdateInput = {};
    if (input.mediaId !== undefined) {
      data.mediaId = await this.resolveMedia(input.businessId, input.mediaId);
    }
    if (input.caption !== undefined) {
      data.caption = this.normalizeCaption(input.caption);
    }
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    const row = await this.prisma.galleryItem.update({
      where: { id: input.itemId },
      data,
    });
    return this.toPublicItem(row);
  }

  async softDeleteItem(
    businessId: string,
    galleryId: string,
    itemId: string,
  ): Promise<void> {
    await this.requireItem(businessId, galleryId, itemId);
    await this.prisma.galleryItem.update({
      where: { id: itemId },
      data: { deletedAt: new Date() },
    });
  }

  /** Rewrite sort_order from an ordered list of item ids (same gallery). */
  async reorderItems(input: {
    businessId: string;
    galleryId: string;
    itemIds: string[];
  }): Promise<PublicGallery> {
    await this.requireGallery(input.businessId, input.galleryId);
    const active = await this.prisma.galleryItem.findMany({
      where: {
        businessId: input.businessId,
        galleryId: input.galleryId,
        deletedAt: null,
      },
      select: { id: true },
    });
    const activeIds = new Set(active.map((a) => a.id));
    if (input.itemIds.length !== activeIds.size) {
      throw new DomainException(
        GalleryErrorCodes.InvalidReorder,
        'Reorder must include every active item exactly once',
        HttpStatus.BAD_REQUEST,
      );
    }
    const seen = new Set<string>();
    for (const id of input.itemIds) {
      if (!activeIds.has(id) || seen.has(id)) {
        throw new DomainException(
          GalleryErrorCodes.InvalidReorder,
          'Invalid item id in reorder list',
          HttpStatus.BAD_REQUEST,
        );
      }
      seen.add(id);
    }
    await this.prisma.$transaction(
      input.itemIds.map((id, index) =>
        this.prisma.galleryItem.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.get(input.businessId, input.galleryId);
  }

  private requireName(raw: string): string {
    const name = raw.trim();
    if (name.length < 1 || name.length > 160) {
      throw new DomainException(
        GalleryErrorCodes.InvalidName,
        'Gallery name is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }
    return name;
  }

  private normalizeCaption(raw: string): string {
    const caption = raw.trim().slice(0, MAX_CAPTION);
    if (raw.trim().length > MAX_CAPTION) {
      throw new DomainException(
        GalleryErrorCodes.InvalidCaption,
        'Caption is too long',
        HttpStatus.BAD_REQUEST,
      );
    }
    return caption;
  }

  private async requireGallery(businessId: string, galleryId: string) {
    const row = await this.prisma.gallery.findFirst({
      where: { id: galleryId, businessId, deletedAt: null },
    });
    if (!row) {
      throw new DomainException(
        GalleryErrorCodes.NotFound,
        'Gallery not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private async requireGalleryWithItems(
    businessId: string,
    galleryId: string,
  ): Promise<Gallery & { items: GalleryItem[] }> {
    const row = await this.prisma.gallery.findFirst({
      where: { id: galleryId, businessId, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!row) {
      throw new DomainException(
        GalleryErrorCodes.NotFound,
        'Gallery not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private async requireItem(
    businessId: string,
    galleryId: string,
    itemId: string,
  ) {
    const row = await this.prisma.galleryItem.findFirst({
      where: { id: itemId, businessId, galleryId, deletedAt: null },
    });
    if (!row) {
      throw new DomainException(
        GalleryErrorCodes.ItemNotFound,
        'Gallery item not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private async resolveMedia(
    businessId: string,
    mediaId: string,
  ): Promise<string> {
    const id = mediaId.trim();
    if (!id) {
      throw new DomainException(
        GalleryErrorCodes.MediaNotFound,
        'Media asset not found for this business',
        HttpStatus.BAD_REQUEST,
      );
    }
    const row = await this.prisma.mediaAsset.findFirst({
      where: { id, businessId, deletedAt: null },
      select: { id: true },
    });
    if (!row) {
      throw new DomainException(
        GalleryErrorCodes.MediaNotFound,
        'Media asset not found for this business',
        HttpStatus.BAD_REQUEST,
      );
    }
    return id;
  }

  private toPublicItem(row: GalleryItem): PublicGalleryItem {
    return {
      id: row.id,
      businessId: row.businessId,
      galleryId: row.galleryId,
      mediaId: row.mediaId,
      caption: row.caption,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toPublicGallery(
    row: Gallery,
    itemCount: number,
    items: GalleryItem[] | undefined,
  ): PublicGallery {
    return {
      id: row.id,
      businessId: row.businessId,
      name: row.name,
      description: row.description,
      sortOrder: row.sortOrder,
      itemCount,
      items: items?.map((i) => this.toPublicItem(i)),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
