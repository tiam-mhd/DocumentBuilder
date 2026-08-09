import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingModule } from '../billing/billing.module';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { FontController } from './font.controller';
import { FontService } from './font.service';
import { ImageDerivativeService } from './image-derivative.service';
import { OBJECT_STORAGE } from './storage/object-storage.port';
import { LocalObjectStorage } from './storage/local-object-storage';
import { S3ObjectStorage } from './storage/s3-object-storage';

/** Assets — media & fonts (Phase 01). */
@Module({
  imports: [
    IdentityModule,
    forwardRef(() => TenancyModule),
    forwardRef(() => BillingModule),
  ],
  controllers: [MediaController, FontController],
  providers: [
    MediaService,
    FontService,
    ImageDerivativeService,
    {
      provide: OBJECT_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const driver = config.get<'local' | 's3'>('STORAGE_DRIVER') ?? 'local';
        if (driver === 's3') {
          return new S3ObjectStorage(config);
        }
        return new LocalObjectStorage(config);
      },
    },
  ],
  exports: [MediaService, FontService, OBJECT_STORAGE],
})
export class AssetsModule {}
