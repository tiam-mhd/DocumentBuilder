import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { DesignModule } from '../design/design.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentBodyRepository } from './document-body.repository';
import { DocumentVersionBodyRepository } from './document-version-body.repository';
import { DocumentVersionsService } from './document-versions.service';
import { DocumentWorkflowService } from './document-workflow.service';
import { DocumentCommentsService } from './document-comments.service';

/** Documents — PG metadata + Mongo body + versions + workflow + comments. */
@Module({
  imports: [
    IdentityModule,
    forwardRef(() => TenancyModule),
    forwardRef(() => BillingModule),
    forwardRef(() => DesignModule),
    AuditModule,
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentVersionsService,
    DocumentWorkflowService,
    DocumentCommentsService,
    DocumentBodyRepository,
    DocumentVersionBodyRepository,
  ],
  exports: [
    DocumentsService,
    DocumentVersionsService,
    DocumentWorkflowService,
    DocumentCommentsService,
    DocumentBodyRepository,
  ],
})
export class DocumentsModule {}
