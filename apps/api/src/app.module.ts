import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './config/prisma/prisma.module';
import { RedisModule } from './config/redis/redis.module';
import { MongoModule } from './config/mongo/mongo.module';
import { EditionModule } from './config/edition/edition.module';
import { IdentityModule } from './modules/identity/identity.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { BillingModule } from './modules/billing/billing.module';
import { ContentModule } from './modules/content/content.module';
import { AssetsModule } from './modules/assets/assets.module';
import { DesignModule } from './modules/design/design.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ExportModule } from './modules/export/export.module';
import { AuditModule } from './modules/audit/audit.module';
import { BackupModule } from './modules/backup/backup.module';
import { BrandingModule } from './modules/branding/branding.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { PluginsModule } from './modules/plugins/plugins.module';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';
import { SystemModule } from './modules/system/system.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    EditionModule,
    PrismaModule,
    RedisModule,
    MongoModule,
    IdentityModule,
    TenancyModule,
    BillingModule,
    AssetsModule,
    /** First-party plugin blocks before design/documents consumers. */
    PluginsModule,
    ContentModule,
    DesignModule,
    DocumentsModule,
    ExportModule,
    AuditModule,
    BackupModule,
    BrandingModule,
    AnalyticsModule,
    MarketplaceModule,
    PlatformAdminModule,
    SystemModule,
  ],
})
export class AppModule {}