import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingModule } from '../billing/billing.module';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { AssetsModule } from '../assets/assets.module';
import { DocumentsModule } from '../documents/documents.module';
import { DocumentHtmlRenderer } from './document-html.renderer';
import { ExportController } from './export.controller';
import { ExportQueueService } from './export-queue.service';
import { ExportService } from './export.service';
import { PDF_RENDERER } from './pdf/pdf-renderer.port';
import { FakePdfRenderer } from './pdf/fake-pdf.renderer';
import { PlaywrightPdfRenderer } from './pdf/playwright-pdf.renderer';

/** Export — PDF queue (BullMQ) + HTML→PDF renderer. */
@Module({
  imports: [
    IdentityModule,
    forwardRef(() => TenancyModule),
    forwardRef(() => BillingModule),
    AssetsModule,
    forwardRef(() => DocumentsModule),
  ],
  controllers: [ExportController],
  providers: [
    ExportService,
    ExportQueueService,
    DocumentHtmlRenderer,
    FakePdfRenderer,
    PlaywrightPdfRenderer,
    {
      provide: PDF_RENDERER,
      inject: [ConfigService, FakePdfRenderer, PlaywrightPdfRenderer],
      useFactory: (
        config: ConfigService,
        fake: FakePdfRenderer,
        playwright: PlaywrightPdfRenderer,
      ) =>
        config.getOrThrow<'fake' | 'playwright'>('PDF_RENDERER') === 'playwright'
          ? playwright
          : fake,
    },
  ],
  exports: [ExportService],
})
export class ExportModule {}
