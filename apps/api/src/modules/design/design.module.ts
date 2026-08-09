import { Module, forwardRef } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { DesignThemeController } from './design-theme.controller';
import { DesignThemeService } from './design-theme.service';
import { DesignThemeSeedHook } from './design-theme-seed.hook';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { TemplateBodyRepository } from './template-body.repository';

/** Design — document brand themes, templates, master pages. */
@Module({
  imports: [
    IdentityModule,
    forwardRef(() => TenancyModule),
    forwardRef(() => BillingModule),
  ],
  controllers: [DesignThemeController, TemplateController],
  providers: [
    DesignThemeService,
    DesignThemeSeedHook,
    TemplateService,
    TemplateBodyRepository,
  ],
  exports: [
    DesignThemeService,
    DesignThemeSeedHook,
    TemplateService,
    TemplateBodyRepository,
  ],
})
export class DesignModule {}
