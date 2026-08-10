import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import type { AppEnv } from '../../config/env.validation';

export const BILLING_DUNNING_QUEUE = 'billing.dunning';

export type DunningJobPayload = {
  /** Optional ISO timestamp for tests; production jobs omit (use wall clock). */
  nowIso?: string;
};

@Injectable()
export class DunningQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(DunningQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue<DunningJobPayload>;
  private worker: Worker<DunningJobPayload> | null = null;

  constructor(config: ConfigService<AppEnv, true>) {
    const url = config.getOrThrow('REDIS_URL', { infer: true });
    this.connection = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    this.connection.on('error', (err) => {
      this.logger.warn(`Dunning Redis error: ${err.message}`);
    });
    this.queue = new Queue<DunningJobPayload>(BILLING_DUNNING_QUEUE, {
      connection: this.connection.duplicate(),
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 50,
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });
  }

  async enqueueTick(payload: DunningJobPayload = {}): Promise<void> {
    await this.queue.add('tick', payload);
  }

  /** Register daily repeatable job (UTC 03:15). Idempotent jobId. */
  async ensureDailySchedule(): Promise<void> {
    const enabled = this.configEnabled();
    if (!enabled) {
      this.logger.log('Billing dunning schedule disabled');
      return;
    }
    await this.queue.upsertJobScheduler(
      'billing-dunning-daily',
      { pattern: '15 3 * * *' },
      {
        name: 'tick',
        data: {},
      },
    );
    this.logger.log('Billing dunning daily schedule ensured (03:15 UTC)');
  }

  startWorker(
    processor: (job: Job<DunningJobPayload>) => Promise<void>,
  ): void {
    if (this.worker) return;
    this.worker = new Worker<DunningJobPayload>(
      BILLING_DUNNING_QUEUE,
      async (job) => processor(job),
      {
        connection: this.connection.duplicate(),
        concurrency: 1,
      },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Dunning job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });
    this.logger.log(`BullMQ worker listening on ${BILLING_DUNNING_QUEUE}`);
  }

  private configEnabled(): boolean {
    // Always schedule when Redis is up; DunningService no-ops on SELF_HOSTED.
    return true;
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue.close();
    await this.connection.quit().catch(() => this.connection.disconnect());
  }
}
