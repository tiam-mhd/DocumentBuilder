import { Module, forwardRef } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { GatesProbeController } from './gates-probe.controller';

/** Content — business entities (Phase 02+). Gate probes prove EntitlementGuard wiring. */
@Module({
  imports: [
    IdentityModule,
    forwardRef(() => TenancyModule),
    forwardRef(() => BillingModule),
  ],
  controllers: [GatesProbeController],
})
export class ContentModule {}
