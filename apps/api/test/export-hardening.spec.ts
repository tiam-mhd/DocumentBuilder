import { ExportErrorCodes } from '@vdb/shared-types';
import { DomainException } from '../src/common/errors/domain.exception';
import { ExportRateStore } from '../src/modules/export/export-rate.store';
import { ExportService } from '../src/modules/export/export.service';

describe('export hardening (P04-T11)', () => {
  describe('ExportRateStore', () => {
    function buildStore(opts: { max: number; window: number }) {
      const client = {
        incr: jest.fn(),
        expire: jest.fn().mockResolvedValue(1),
      };
      const redis = {
        ensureConnected: jest.fn().mockResolvedValue(client),
      };
      const config = {
        get: jest.fn((key: string) => {
          if (key === 'EXPORT_RATE_MAX') return opts.max;
          if (key === 'EXPORT_RATE_WINDOW_SECONDS') return opts.window;
          return undefined;
        }),
      };
      const store = new ExportRateStore(redis as never, config as never);
      return { store, client };
    }

    it('allows requests within the window budget', async () => {
      const { store, client } = buildStore({ max: 3, window: 60 });
      client.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
      await expect(store.assertCanEnqueue('biz1')).resolves.toBeUndefined();
      await expect(store.assertCanEnqueue('biz1')).resolves.toBeUndefined();
      expect(client.expire).toHaveBeenCalledWith('export:rate:biz1', 60);
    });

    it('rejects when rate max exceeded', async () => {
      const { store, client } = buildStore({ max: 2, window: 60 });
      client.incr.mockResolvedValue(3);
      await expect(store.assertCanEnqueue('biz1')).rejects.toMatchObject({
        code: ExportErrorCodes.RateLimited,
      } satisfies Partial<DomainException>);
    });
  });

  describe('ExportService.createPdfJob concurrent cap', () => {
    function buildService(inFlight: number) {
      const prisma = {
        document: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'doc1',
            businessId: 'biz1',
            status: 'published',
            deletedAt: null,
          }),
        },
        exportJob: {
          count: jest.fn().mockResolvedValue(inFlight),
          create: jest.fn(),
        },
      };
      const bodies = { find: jest.fn().mockResolvedValue(null) };
      const queue = {
        enqueue: jest.fn(),
        startWorker: jest.fn(),
      };
      const rate = { assertCanEnqueue: jest.fn().mockResolvedValue(undefined) };
      const config = {
        get: jest.fn((key: string) => {
          if (key === 'EXPORT_MAX_CONCURRENT_PER_BUSINESS') return 2;
          return undefined;
        }),
      };
      const noop = {} as never;
      const service = new ExportService(
        prisma as never,
        bodies as never,
        queue as never,
        rate as never,
        noop,
        noop,
        noop,
        noop,
        noop,
        noop,
        noop,
        { log: jest.fn() } as never,
        config as never,
        noop,
        noop,
      );
      return { service, prisma, rate, queue };
    }

    it('rejects when in-flight exports hit the business cap', async () => {
      const { service, prisma, queue } = buildService(2);
      await expect(
        service.createPdfJob({ businessId: 'biz1', documentId: 'doc1' }),
      ).rejects.toMatchObject({
        code: ExportErrorCodes.TooManyConcurrent,
      });
      expect(prisma.exportJob.create).not.toHaveBeenCalled();
      expect(queue.enqueue).not.toHaveBeenCalled();
    });

    it('enqueues when under the concurrent cap', async () => {
      const { service, prisma, queue, rate } = buildService(1);
      prisma.exportJob.create.mockResolvedValue({
        id: 'job1',
        businessId: 'biz1',
        documentId: 'doc1',
        status: 'queued',
        errorCode: null,
        errorMessage: null,
        byteSize: null,
        mimeType: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: null,
        finishedAt: null,
      });
      queue.enqueue.mockResolvedValue(undefined);
      const job = await service.createPdfJob({
        businessId: 'biz1',
        documentId: 'doc1',
      });
      expect(rate.assertCanEnqueue).toHaveBeenCalledWith('biz1');
      expect(queue.enqueue).toHaveBeenCalled();
      expect(job.id).toBe('job1');
    });
  });
});
