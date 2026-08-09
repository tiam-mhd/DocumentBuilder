import { FontErrorCodes } from '@vdb/shared-types';
import { FontService } from '../src/modules/assets/font.service';

describe('FontService', () => {
  function build() {
    const storage = {
      driver: 'local' as const,
      put: jest.fn().mockResolvedValue({
        key: 'k',
        contentType: 'font/woff2',
        byteSize: 10,
      }),
      get: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      publicUrlHint: jest.fn(),
    };
    const prisma = {
      fontFace: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async ({ data }) => ({
          ...data,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          deletedAt: null,
        })),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
    };
    const service = new FontService(prisma as never, storage as never);
    return { service, storage, prisma };
  }

  it('rejects non-font extensions', () => {
    const { service } = build();
    try {
      service.validateUpload(
        { originalname: 'x.woff', mimetype: 'font/woff', size: 10 },
        1_000_000,
      );
      fail('expected throw');
    } catch (err) {
      expect(err).toMatchObject({ code: FontErrorCodes.InvalidType });
    }
  });

  it('accepts woff2 by extension', () => {
    const { service } = build();
    expect(
      service.validateUpload(
        { originalname: 'Vazir.woff2', mimetype: 'application/octet-stream', size: 10 },
        1_000_000,
      ),
    ).toBe('woff2');
  });

  it('uploads and returns storageKey contract path', async () => {
    const { service, storage, prisma } = build();
    const file = {
      buffer: Buffer.from('font-bytes'),
      mimetype: 'font/ttf',
      size: 10,
      originalname: 'Family.ttf',
    } as Express.Multer.File;

    const face = await service.upload({
      businessId: 'biz_1',
      file,
      family: 'Vazirmatn',
      weight: 400,
      style: 'normal',
      maxBytes: 1_000_000,
    });

    expect(storage.put).toHaveBeenCalled();
    expect(face.storageKey).toMatch(/^biz_1\/fonts\/[a-z0-9]+\/original\.ttf$/);
    expect(face.fileUrl).toContain('/fonts/');
    expect(prisma.fontFace.create).toHaveBeenCalled();
  });

  it('denies duplicate family/weight/style', async () => {
    const { service, prisma } = build();
    prisma.fontFace.findFirst.mockResolvedValue({ id: 'existing' });
    const file = {
      buffer: Buffer.from('font-bytes'),
      mimetype: 'font/woff2',
      size: 10,
      originalname: 'a.woff2',
    } as Express.Multer.File;

    await expect(
      service.upload({
        businessId: 'biz_1',
        file,
        family: 'Inter',
        weight: 700,
        style: 'normal',
        maxBytes: 1_000_000,
      }),
    ).rejects.toMatchObject({ code: FontErrorCodes.Duplicate });
  });
});
