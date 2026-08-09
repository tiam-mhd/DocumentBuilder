import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type Job } from 'bullmq';
import Redis from 'ioredis';

export const BACKUP_WORKSPACE_QUEUE = 'backup.workspace';

export type BackupWorkspaceJobPayload = {
  jobId: string;
  businessId: string;
};

@Injectable()
export class BackupQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(BackupQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue<BackupWorkspaceJobPayload>;
  private worker: Worker<BackupWorkspaceJobPayload> | null = null;

  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>('REDIS_URL');
    this.connection = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    this.connection.on('error', (err) => {
      this.logger.warn(`Backup Redis error: ${err.message}`);
    });
    this.queue = new Queue<BackupWorkspaceJobPayload>(BACKUP_WORKSPACE_QUEUE, {
      connection: this.connection.duplicate(),
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 1,
      },
    });
  }

  async enqueue(payload: BackupWorkspaceJobPayload): Promise<void> {
    await this.queue.add('build-backup', payload, { jobId: payload.jobId });
  }

  startWorker(
    processor: (job: Job<BackupWorkspaceJobPayload>) => Promise<void>,
  ): void {
    if (this.worker) return;
    this.worker = new Worker<BackupWorkspaceJobPayload>(
      BACKUP_WORKSPACE_QUEUE,
      async (job) => processor(job),
      {
        connection: this.connection.duplicate(),
        concurrency: 1,
      },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Backup job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });
    this.logger.log(`BullMQ worker listening on ${BACKUP_WORKSPACE_QUEUE}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue.close();
    await this.connection.quit().catch(() => this.connection.disconnect());
  }
}
