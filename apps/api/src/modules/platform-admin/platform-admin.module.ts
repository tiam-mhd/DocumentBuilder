import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EditionModule } from '../../config/edition/edition.module';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { IdentityModule } from '../identity/identity.module';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminService } from './platform-admin.service';

@Module({
  imports: [
    ConfigModule,
    EditionModule,
    IdentityModule,
    AuditModule,
    forwardRef(() => BillingModule),
  ],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService, PlatformAdminGuard],
  exports: [PlatformAdminService],
})
export class PlatformAdminModule implements OnModuleInit {
  constructor(private readonly platformAdmin: PlatformAdminService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.platformAdmin.syncBootstrapAdmins();
    } catch {
      // DB may be unavailable at boot — seed/migrate handles later.
    }
  }
}
