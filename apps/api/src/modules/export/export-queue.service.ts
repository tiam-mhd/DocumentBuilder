import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import type { AppEnv } from '../../config/env.validation';

export const EXPORT_PDF_QUEUE = 'export.pdf';

export type ExportPdfJobPayload = {
  jobId: string;
  businessId: string;
  documentId: string;
};

@Injectable()
export class ExportQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(ExportQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue<ExportPdfJobPayload>;
  private worker: Worker<ExportPdfJobPayload> | null = null;
  private readonly workerConcurrency: number;

  constructor(config: ConfigService<AppEnv, true>) {
    const url = config.getOrThrow('REDIS_URL', { infer: true });
    this.workerConcurrency = config.get('EXPORT_WORKER_CONCURRENCY', {
      infer: true,
    });
    // BullMQ requires maxRetriesPerRequest: null
    this.connection = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    this.connection.on('error', (err) => {
      this.logger.warn(`Export Redis error: ${err.message}`);
    });
    this.queue = new Queue<ExportPdfJobPayload>(EXPORT_PDF_QUEUE, {
      connection: this.connection.duplicate(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
      },
    });
  }

  async enqueue(payload: ExportPdfJobPayload): Promise<void> {
    await this.queue.add('render-pdf', payload, {
      jobId: payload.jobId,
    });
  }

  /** Approximate waiting+active depth (for smoke/load checks). */
  async getQueueCounts(): Promise<{
    waiting: number;
    active: number;
    delayed: number;
  }> {
    const counts = await this.queue.getJobCounts(
      'waiting',
      'active',
      'delayed',
    );
    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      delayed: counts.delayed ?? 0,
    };
  }

  startWorker(
    processor: (job: Job<ExportPdfJobPayload>) => Promise<void>,
  ): void {
    if (this.worker) return;
    this.worker = new Worker<ExportPdfJobPayload>(
      EXPORT_PDF_QUEUE,
      async (job) => processor(job),
      {
        connection: this.connection.duplicate(),
        concurrency: this.workerConcurrency,
      },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Export job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });
    this.logger.log(
      `BullMQ worker listening on ${EXPORT_PDF_QUEUE} (concurrency=${this.workerConcurrency})`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue.close();
    await this.connection.quit().catch(() => this.connection.disconnect());
  }
}
