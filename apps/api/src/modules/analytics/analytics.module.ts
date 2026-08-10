import { Module, forwardRef } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueueService } from './analytics-queue.service';

@Module({
  imports: [IdentityModule, forwardRef(() => TenancyModule)],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsQueueService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
