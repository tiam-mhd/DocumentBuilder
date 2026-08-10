import { Module, forwardRef } from '@nestjs/common';
import { EditionModule } from '../../config/edition/edition.module';
import { BillingModule } from '../billing/billing.module';
import { DesignModule } from '../design/design.module';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

@Module({
  imports: [
    EditionModule,
    IdentityModule,
    forwardRef(() => TenancyModule),
    forwardRef(() => BillingModule),
    forwardRef(() => DesignModule),
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
