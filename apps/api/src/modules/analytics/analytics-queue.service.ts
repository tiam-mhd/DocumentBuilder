import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import type {
  AnalyticsEventKindValue,
  AnalyticsEventSourceValue,
  AnalyticsDeviceValue,
} from '@vdb/shared-types';

export const ANALYTICS_INGEST_QUEUE = 'analytics.ingest';

export type AnalyticsIngestPayload = {
  businessId: string;
  documentId: string;
  kind: AnalyticsEventKindValue;
  source: AnalyticsEventSourceValue;
  country: string | null;
  device: AnalyticsDeviceValue | null;
  occurredAt: string;
};

@Injectable()
export class AnalyticsQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue<AnalyticsIngestPayload>;
  private worker: Worker<AnalyticsIngestPayload> | null = null;

  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>('REDIS_URL');
    this.connection = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    this.connection.on('error', (err) => {
      this.logger.warn(`Analytics Redis error: ${err.message}`);
    });
    this.queue = new Queue<AnalyticsIngestPayload>(ANALYTICS_INGEST_QUEUE, {
      connection: this.connection.duplicate(),
      defaultJobOptions: {
        removeOnComplete: 500,
        removeOnFail: 200,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    });
  }

  async enqueue(payload: AnalyticsIngestPayload): Promise<void> {
    await this.queue.add('ingest', payload);
  }

  startWorker(
    processor: (job: Job<AnalyticsIngestPayload>) => Promise<void>,
  ): void {
    if (this.worker) return;
    this.worker = new Worker<AnalyticsIngestPayload>(
      ANALYTICS_INGEST_QUEUE,
      async (job) => processor(job),
      {
        connection: this.connection.duplicate(),
        concurrency: 4,
      },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Analytics job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });
    this.logger.log(`BullMQ worker listening on ${ANALYTICS_INGEST_QUEUE}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue.close();
    await this.connection.quit().catch(() => this.connection.disconnect());
  }
}
