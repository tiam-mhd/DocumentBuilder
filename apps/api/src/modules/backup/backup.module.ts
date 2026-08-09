import { Module, forwardRef } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { BackupController } from './backup.controller';
import { BackupQueueService } from './backup-queue.service';
import { BackupService } from './backup.service';
import { RestoreQueueService } from './restore-queue.service';

/** Workspace backup / restore — ZIP package + BullMQ (ADR 024). */
@Module({
  imports: [
    IdentityModule,
    forwardRef(() => TenancyModule),
    forwardRef(() => BillingModule),
    AssetsModule,
    forwardRef(() => AuditModule),
  ],
  controllers: [BackupController],
  providers: [
    BackupService,
    BackupQueueService,
    RestoreQueueService,
  ],
  exports: [BackupService],
})
export class BackupModule {}
