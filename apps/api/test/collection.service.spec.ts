import { CollectionService } from '../src/modules/content/collection.service';
import { DomainException } from '../src/common/errors/domain.exception';
import { CollectionErrorCodes } from '@vdb/shared-types';

describe('CollectionService', () => {
  const businessId = 'biz_1';

  function serviceWithPrisma(prisma: unknown) {
    return new CollectionService(prisma as never);
  }

  it('rejects invalid source', async () => {
    const svc = serviceWithPrisma({});
    await expect(
      svc.list({ businessId, source: 'not-a-source' }),
    ).rejects.toBeInstanceOf(DomainException);
    try {
      await svc.list({ businessId, source: 'not-a-source' });
    } catch (err) {
      expect((err as DomainException).code).toBe(
        CollectionErrorCodes.InvalidSource,
      );
    }
  });

  it('maps projects to flat title/description/status values', async () => {
    const prisma = {
      project: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            title: 'Alpha',
            description: 'Desc',
            status: 'active',
            translations: {},
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const svc = serviceWithPrisma(prisma);
    const list = await svc.list({
      businessId,
      source: 'projects',
      limit: 10,
    });
    expect(list.source).toBe('projects');
    expect(list.items).toEqual([
      {
        id: 'p1',
        values: {
          title: 'Alpha',
          description: 'Desc',
          status: 'active',
        },
      },
    ]);
    expect(list.total).toBe(1);
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId, deletedAt: null },
        take: 10,
      }),
    );
  });

  it('resolves English project titles from translations with FA fallback', async () => {
    const prisma = {
      project: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            title: 'آلفا',
            description: 'توضیح',
            status: 'published',
            translations: { en: { title: 'Alpha EN' } },
          },
          {
            id: 'p2',
            title: 'بتا',
            description: 'بدون ترجمه',
            status: 'draft',
            translations: {},
          },
        ]),
        count: jest.fn().mockResolvedValue(2),
      },
    };
    const svc = serviceWithPrisma(prisma);
    const list = await svc.list({
      businessId,
      source: 'projects',
      limit: 10,
      locale: 'en',
    });
    expect(list.items[0]!.values.title).toBe('Alpha EN');
    expect(list.items[0]!.values.description).toBe('توضیح');
    expect(list.items[1]!.values.title).toBe('بتا');
  });
});
