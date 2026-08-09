import { GalleryErrorCodes } from '@vdb/shared-types';
import { GalleryService } from '../src/modules/content/gallery.service';

describe('GalleryService', () => {
  function build(overrides?: { mediaFindFirst?: jest.Mock }) {
    const stamp = () => ({
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });
    const gallery = {
      findFirst: jest.fn().mockResolvedValue({
        id: 'gal_1',
        businessId: 'biz_1',
        name: 'آلبوم',
        description: '',
        sortOrder: 0,
        items: [],
        ...stamp(),
      }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'gal_1',
          ...data,
          ...stamp(),
        }),
      ),
      update: jest.fn(),
    };
    const galleryItem = {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'gi_1',
          ...data,
          ...stamp(),
        }),
      ),
      update: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 0 } }),
    };
    const mediaAsset = {
      findFirst:
        overrides?.mediaFindFirst ??
        jest.fn().mockResolvedValue({ id: 'media_1' }),
    };
    const prisma = {
      gallery,
      galleryItem,
      mediaAsset,
      $transaction: jest.fn(async (ops: unknown) => {
        if (Array.isArray(ops)) {
          return Promise.all(ops);
        }
        return ops;
      }),
    };
    return { service: new GalleryService(prisma as never), prisma };
  }

  it('creates gallery and adds media item', async () => {
    const { service, prisma } = build();
    const gal = await service.create({
      businessId: 'biz_1',
      name: 'پروژه‌ها',
      description: 'نمونه',
    });
    expect(gal.name).toBe('پروژه‌ها');
    expect(gal.itemCount).toBe(0);

    const item = await service.addItem({
      businessId: 'biz_1',
      galleryId: 'gal_1',
      mediaId: 'media_1',
      caption: 'کپشن',
    });
    expect(prisma.galleryItem.create).toHaveBeenCalled();
    expect(item.caption).toBe('کپشن');
    expect(item.mediaId).toBe('media_1');
  });

  it('rejects unknown media', async () => {
    const { service } = build({
      mediaFindFirst: jest.fn().mockResolvedValue(null),
    });
    await expect(
      service.addItem({
        businessId: 'biz_1',
        galleryId: 'gal_1',
        mediaId: 'missing',
      }),
    ).rejects.toMatchObject({ code: GalleryErrorCodes.MediaNotFound });
  });

  it('rejects incomplete reorder', async () => {
    const { service, prisma } = build();
    prisma.galleryItem.findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    await expect(
      service.reorderItems({
        businessId: 'biz_1',
        galleryId: 'gal_1',
        itemIds: ['a'],
      }),
    ).rejects.toMatchObject({ code: GalleryErrorCodes.InvalidReorder });
  });
});
