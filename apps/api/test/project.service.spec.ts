import { ProjectErrorCodes, ProjectStatus } from '@vdb/shared-types';
import { ProjectService } from '../src/modules/content/project.service';

describe('ProjectService', () => {
  function build(overrides?: {
    mediaFindFirst?: jest.Mock;
    categoryFindFirst?: jest.Mock;
  }) {
    const projectCategory = {
      findFirst:
        overrides?.categoryFindFirst ??
        jest.fn().mockResolvedValue({
          id: 'cat_1',
          businessId: 'biz_1',
          name: 'ساختمان',
          sortOrder: 0,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          deletedAt: null,
        }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'cat_1',
        ...data,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
      })),
      update: jest.fn(),
    };
    const project = {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(
        async ({
          data,
        }: {
          data: Record<string, unknown>;
          include?: unknown;
        }) => ({
          id: 'proj_1',
          category: data.categoryId
            ? {
                id: data.categoryId,
                name: 'ساختمان',
                businessId: 'biz_1',
                sortOrder: 0,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                deletedAt: null,
              }
            : null,
          ...data,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          deletedAt: null,
        }),
      ),
      update: jest.fn(),
    };
    const mediaAsset = {
      findFirst:
        overrides?.mediaFindFirst ??
        jest.fn().mockResolvedValue({ id: 'media_1' }),
    };
    const prisma = { projectCategory, project, mediaAsset };
    const locations = {
      resolveOptionalId: jest.fn().mockResolvedValue(null),
    };
    const service = new ProjectService(prisma as never, locations as never);
    return { service, prisma, locations };
  }

  it('creates project with category and media refs', async () => {
    const { service, prisma } = build();
    const created = await service.create({
      businessId: 'biz_1',
      title: 'برج نمونه',
      description: 'توضیح',
      categoryId: 'cat_1',
      coverMediaId: 'media_1',
      mediaIds: ['media_1'],
      fields: { year: 2024 },
      locationId: null,
    });
    expect(prisma.project.create).toHaveBeenCalled();
    expect(created.title).toBe('برج نمونه');
    expect(created.categoryId).toBe('cat_1');
    expect(created.mediaIds).toContain('media_1');
    expect(created.status).toBe(ProjectStatus.Draft);
    expect(created.locationId).toBeNull();
  });

  it('rejects unknown media', async () => {
    const { service } = build({
      mediaFindFirst: jest.fn().mockResolvedValue(null),
    });
    await expect(
      service.create({
        businessId: 'biz_1',
        title: 'x',
        coverMediaId: 'missing',
      }),
    ).rejects.toMatchObject({ code: ProjectErrorCodes.MediaNotFound });
  });

  it('rejects invalid status', async () => {
    const { service } = build();
    await expect(
      service.create({
        businessId: 'biz_1',
        title: 'x',
        status: 'nope',
      }),
    ).rejects.toMatchObject({ code: ProjectErrorCodes.InvalidStatus });
  });

  it('soft-deletes category only when unused', async () => {
    const { service, prisma } = build();
    prisma.project.count = jest.fn().mockResolvedValue(1);
    await expect(
      service.softDeleteCategory('biz_1', 'cat_1'),
    ).rejects.toMatchObject({ code: ProjectErrorCodes.CategoryInUse });

    prisma.project.count = jest.fn().mockResolvedValue(0);
    prisma.projectCategory.update = jest.fn().mockResolvedValue({});
    await service.softDeleteCategory('biz_1', 'cat_1');
    expect(prisma.projectCategory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cat_1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });
});
