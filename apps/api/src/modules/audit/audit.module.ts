import { Module, forwardRef } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { IdentityModule } from '../identity/identity.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

/** Audit — append-only security & workflow events + Owner list API. */
@Module({
  imports: [
    forwardRef(() => IdentityModule),
    forwardRef(() => TenancyModule),
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
