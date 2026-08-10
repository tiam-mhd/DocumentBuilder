import { Module, forwardRef } from '@nestjs/common';
import { EditionModule } from '../../config/edition/edition.module';
import { AssetsModule } from '../assets/assets.module';
import { BillingModule } from '../billing/billing.module';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import {
  BrandingController,
  BrandingPublicController,
  BrandingPublicLogoController,
} from './branding.controller';
import { BrandingService } from './branding.service';

@Module({
  imports: [
    EditionModule,
    IdentityModule,
    AssetsModule,
    forwardRef(() => TenancyModule),
    forwardRef(() => BillingModule),
  ],
  controllers: [
    BrandingController,
    BrandingPublicController,
    BrandingPublicLogoController,
  ],
  providers: [BrandingService],
  exports: [BrandingService],
})
export class BrandingModule {}