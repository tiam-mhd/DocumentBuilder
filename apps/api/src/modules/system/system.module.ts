import { Module, forwardRef } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BillingModule } from '../billing/billing.module';
import { HealthController } from './health.controller';
import { SystemController } from './system.controller';
import { HealthService } from './health.service';

@Module({
  imports: [TerminusModule, forwardRef(() => BillingModule)],
  controllers: [HealthController, SystemController],
  providers: [HealthService],
})
export class SystemModule {}
