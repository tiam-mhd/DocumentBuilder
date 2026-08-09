import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type Job } from 'bullmq';
import Redis from 'ioredis';

export const IMPORT_CONTENT_QUEUE = 'import.content';

export type ImportContentJobPayload = {
  jobId: string;
  businessId: string;
};

@Injectable()
export class ImportQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(ImportQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue<ImportContentJobPayload>;
  private worker: Worker<ImportContentJobPayload> | null = null;

  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>('REDIS_URL');
    this.connection = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    this.connection.on('error', (err) => {
      this.logger.warn(`Import Redis error: ${err.message}`);
    });
    this.queue = new Queue<ImportContentJobPayload>(IMPORT_CONTENT_QUEUE, {
      connection: this.connection.duplicate(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
      },
    });
  }

  async enqueue(payload: ImportContentJobPayload): Promise<void> {
    await this.queue.add('commit-import', payload, {
      jobId: payload.jobId,
    });
  }

  startWorker(
    processor: (job: Job<ImportContentJobPayload>) => Promise<void>,
  ): void {
    if (this.worker) return;
    this.worker = new Worker<ImportContentJobPayload>(
      IMPORT_CONTENT_QUEUE,
      async (job) => processor(job),
      {
        connection: this.connection.duplicate(),
        concurrency: 1,
      },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Import job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });
    this.logger.log(`BullMQ worker listening on ${IMPORT_CONTENT_QUEUE}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue.close();
    await this.connection.quit().catch(() => this.connection.disconnect());
  }
}
