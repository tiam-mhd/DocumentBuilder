import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DunningQueueService } from './dunning-queue.service';
import { DunningService } from './dunning.service';

@Injectable()
export class DunningScheduler implements OnModuleInit {
  private readonly logger = new Logger(DunningScheduler.name);

  constructor(
    private readonly queue: DunningQueueService,
    private readonly dunning: DunningService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.queue.startWorker(async (job) => {
      const now = job.data.nowIso ? new Date(job.data.nowIso) : new Date();
      await this.dunning.runTick(now);
    });
    try {
      await this.queue.ensureDailySchedule();
    } catch (err) {
      this.logger.warn(
        `Could not ensure dunning schedule: ${
          err instanceof Error ? err.message : 'error'
        }`,
      );
    }
  }
}
