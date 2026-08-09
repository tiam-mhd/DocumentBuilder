import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type Job } from 'bullmq';
import Redis from 'ioredis';

export const RESTORE_WORKSPACE_QUEUE = 'restore.workspace';

export type RestoreWorkspaceJobPayload = {
  jobId: string;
  businessId: string;
};

@Injectable()
export class RestoreQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(RestoreQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue<RestoreWorkspaceJobPayload>;
  private worker: Worker<RestoreWorkspaceJobPayload> | null = null;

  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>('REDIS_URL');
    this.connection = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    this.connection.on('error', (err) => {
      this.logger.warn(`Restore Redis error: ${err.message}`);
    });
    this.queue = new Queue<RestoreWorkspaceJobPayload>(
      RESTORE_WORKSPACE_QUEUE,
      {
        connection: this.connection.duplicate(),
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 100,
          attempts: 1,
        },
      },
    );
  }

  async enqueue(payload: RestoreWorkspaceJobPayload): Promise<void> {
    await this.queue.add('apply-restore', payload, { jobId: payload.jobId });
  }

  startWorker(
    processor: (job: Job<RestoreWorkspaceJobPayload>) => Promise<void>,
  ): void {
    if (this.worker) return;
    this.worker = new Worker<RestoreWorkspaceJobPayload>(
      RESTORE_WORKSPACE_QUEUE,
      async (job) => processor(job),
      {
        connection: this.connection.duplicate(),
        concurrency: 1,
      },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Restore job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });
    this.logger.log(`BullMQ worker listening on ${RESTORE_WORKSPACE_QUEUE}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue.close();
    await this.connection.quit().catch(() => this.connection.disconnect());
  }
}
