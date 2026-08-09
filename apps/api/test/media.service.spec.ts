import { MediaErrorCodes } from '@vdb/shared-types';
import { MediaService } from '../src/modules/assets/media.service';

describe('MediaService', () => {
  function build() {
    const storage = {
      driver: 'local' as const,
      put: jest.fn().mockResolvedValue({ key: 'k', contentType: 'image/jpeg', byteSize: 10 }),
      get: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      publicUrlHint: jest.fn(),
    };
    const derivatives = {
      build: jest.fn().mockResolvedValue({
        width: 100,
        height: 80,
        thumb: { buffer: Buffer.from('t'), contentType: 'image/webp', ext: 'webp' },
        web: { buffer: Buffer.from('w'), contentType: 'image/webp', ext: 'webp' },
        print: { buffer: Buffer.from('p'), contentType: 'image/jpeg', ext: 'jpg' },
      }),
    };
    const prisma = {
      mediaAsset: {
        create: jest.fn().mockImplementation(async ({ data }) => ({
          ...data,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          deletedAt: null,
          status: 'ready',
        })),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    const service = new MediaService(
      prisma as never,
      storage as never,
      derivatives as never,
    );
    return { service, storage, derivatives, prisma };
  }

  it('rejects SVG uploads', () => {
    const { service } = build();
    try {
      service.validateUpload(
        {
          mimetype: 'image/svg+xml',
          size: 100,
          originalname: 'x.svg',
        },
        1_000_000,
      );
      fail('expected throw');
    } catch (err) {
      expect(err).toMatchObject({ code: MediaErrorCodes.SvgForbidden });
    }
  });

  it('rejects disallowed MIME', () => {
    const { service } = build();
    try {
      service.validateUpload(
        {
          mimetype: 'application/pdf',
          size: 100,
          originalname: 'x.pdf',
        },
        1_000_000,
      );
      fail('expected throw');
    } catch (err) {
      expect(err).toMatchObject({ code: MediaErrorCodes.InvalidType });
    }
  });

  it('rejects oversized files', () => {
    const { service } = build();
    try {
      service.validateUpload(
        {
          mimetype: 'image/jpeg',
          size: 2_000,
          originalname: 'x.jpg',
        },
        1_000,
      );
      fail('expected throw');
    } catch (err) {
      expect(err).toMatchObject({ code: MediaErrorCodes.TooLarge });
    }
  });

  it('uploads jpeg and stores derivatives', async () => {
    const { service, storage, derivatives, prisma } = build();
    const file = {
      buffer: Buffer.from('fake-image'),
      mimetype: 'image/jpeg',
      size: 10,
      originalname: 'photo.jpg',
    } as Express.Multer.File;

    const asset = await service.upload({
      businessId: 'biz_1',
      file,
      maxBytes: 1_000_000,
    });

    expect(derivatives.build).toHaveBeenCalled();
    expect(storage.put).toHaveBeenCalledTimes(4);
    expect(prisma.mediaAsset.create).toHaveBeenCalled();
    expect(asset.businessId).toBe('biz_1');
    expect(asset.urls.thumb).toContain('variant=thumb');
  });

  it('lists only within business scope query', async () => {
    const { service, prisma } = build();
    await service.list({ businessId: 'biz_1', page: 1, pageSize: 10, q: 'logo' });
    expect(prisma.mediaAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: 'biz_1',
          deletedAt: null,
          originalName: expect.objectContaining({ contains: 'logo' }),
        }),
      }),
    );
  });
});
