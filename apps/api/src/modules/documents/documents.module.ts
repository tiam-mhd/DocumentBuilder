import { Module, forwardRef } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { DesignModule } from '../design/design.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentBodyRepository } from './document-body.repository';

/** Documents — PG metadata + Mongo body (Phase 01). */
@Module({
  imports: [
    IdentityModule,
    forwardRef(() => TenancyModule),
    forwardRef(() => BillingModule),
    forwardRef(() => DesignModule),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentBodyRepository],
  exports: [DocumentsService, DocumentBodyRepository],
})
export class DocumentsModule {}
