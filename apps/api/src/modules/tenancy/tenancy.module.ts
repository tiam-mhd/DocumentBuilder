import { Module, forwardRef } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { BillingModule } from '../billing/billing.module';
import { DesignModule } from '../design/design.module';
import { TrialFirstBusinessHook } from '../billing/trial-first-business.hook';
import { DesignThemeSeedHook } from '../design/design-theme-seed.hook';
import {
  BUSINESS_CREATED_HOOK,
  type BusinessCreatedHook,
} from './business-created.hook';
import { TenancyController } from './tenancy.controller';
import { TenancyService } from './tenancy.service';

@Module({
  imports: [
    IdentityModule,
    forwardRef(() => BillingModule),
    forwardRef(() => DesignModule),
  ],
  controllers: [TenancyController],
  providers: [
    TenancyService,
    {
      provide: BUSINESS_CREATED_HOOK,
      inject: [TrialFirstBusinessHook, DesignThemeSeedHook],
      useFactory: (
        trial: TrialFirstBusinessHook,
        theme: DesignThemeSeedHook,
      ): BusinessCreatedHook => ({
        async afterBusinessCreated(tx, context) {
          await trial.afterBusinessCreated(tx, context);
          await theme.afterBusinessCreated(tx, context);
        },
      }),
    },
  ],
  exports: [TenancyService],
})
export class TenancyModule {}
