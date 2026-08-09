import { TimelineErrorCodes } from '@vdb/shared-types';
import { TimelineService } from '../src/modules/content/timeline.service';

describe('TimelineService', () => {
  function build(overrides?: { mediaFindFirst?: jest.Mock }) {
    const timelineEvent = {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'te_1',
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
    const prisma = { timelineEvent, mediaAsset };
    return {
      service: new TimelineService(prisma as never),
      prisma,
    };
  }

  it('creates an event with date and title', async () => {
    const { service, prisma } = build();
    const row = await service.create({
      businessId: 'biz_1',
      occurredAt: '2020-03-15',
      title: 'تأسیس شرکت',
      body: 'شروع فعالیت',
      mediaId: 'media_1',
    });
    expect(prisma.timelineEvent.create).toHaveBeenCalled();
    expect(row.title).toBe('تأسیس شرکت');
    expect(row.mediaId).toBe('media_1');
    expect(row.occurredAt).toContain('2020-03-15');
  });

  it('rejects invalid date', async () => {
    const { service } = build();
    await expect(
      service.create({
        businessId: 'biz_1',
        occurredAt: 'not-a-date',
        title: 'x',
      }),
    ).rejects.toMatchObject({ code: TimelineErrorCodes.InvalidDate });
  });

  it('rejects unknown media', async () => {
    const { service } = build({
      mediaFindFirst: jest.fn().mockResolvedValue(null),
    });
    await expect(
      service.create({
        businessId: 'biz_1',
        occurredAt: '2021-01-01',
        title: 'x',
        mediaId: 'missing',
      }),
    ).rejects.toMatchObject({ code: TimelineErrorCodes.MediaNotFound });
  });

  it('listForBlock returns newest-first slice', async () => {
    const { service, prisma } = build();
    prisma.timelineEvent.findMany = jest.fn().mockResolvedValue([
      {
        id: 'a',
        businessId: 'biz_1',
        occurredAt: new Date('2024-01-01'),
        title: 'A',
        body: '',
        mediaId: null,
        sortOrder: 0,
        fields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);
    const items = await service.listForBlock({ businessId: 'biz_1', limit: 5 });
    expect(items).toHaveLength(1);
    expect(prisma.timelineEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
  });
});
