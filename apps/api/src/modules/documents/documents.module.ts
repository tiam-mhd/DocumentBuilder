import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { BrandingModule } from '../branding/branding.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { DesignModule } from '../design/design.module';
import { ExportModule } from '../export/export.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentBodyRepository } from './document-body.repository';
import { DocumentVersionBodyRepository } from './document-version-body.repository';
import { DocumentVersionsService } from './document-versions.service';
import { DocumentWorkflowService } from './document-workflow.service';
import { DocumentCommentsService } from './document-comments.service';
import { DocumentWebPublishService } from './document-web-publish.service';
import { DocumentWebPublishPublicController } from './document-web-publish.public.controller';
import { DocumentShareLinksService } from './document-share-links.service';
import { DocumentShareLinksPublicController } from './document-share-links.public.controller';
import { ShareLinkRateStore } from './share-link-rate.store';

/** Documents — PG + Mongo + versions + workflow + comments + web publish + share links. */
@Module({
  imports: [
    IdentityModule,
    forwardRef(() => TenancyModule),
    forwardRef(() => BillingModule),
    forwardRef(() => DesignModule),
    forwardRef(() => ExportModule),
    BrandingModule,
    AnalyticsModule,
    AuditModule,
  ],
  controllers: [
    DocumentsController,
    DocumentWebPublishPublicController,
    DocumentShareLinksPublicController,
  ],
  providers: [
    DocumentsService,
    DocumentVersionsService,
    DocumentWorkflowService,
    DocumentCommentsService,
    DocumentWebPublishService,
    DocumentShareLinksService,
    ShareLinkRateStore,
    DocumentBodyRepository,
    DocumentVersionBodyRepository,
  ],
  exports: [
    DocumentsService,
    DocumentVersionsService,
    DocumentWorkflowService,
    DocumentCommentsService,
    DocumentWebPublishService,
    DocumentShareLinksService,
    DocumentBodyRepository,
  ],
})
export class DocumentsModule {}
