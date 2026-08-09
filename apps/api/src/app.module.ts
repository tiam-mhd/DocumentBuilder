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
    ContentModule,
    AssetsModule,
    DesignModule,
    DocumentsModule,
    ExportModule,
    AuditModule,
    SystemModule,
  ],
})
export class AppModule {}
