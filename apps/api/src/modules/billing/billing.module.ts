import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformBillingAdapter } from './adapters/platform-billing.adapter';
import { LicenseGateAdapter } from './adapters/license-gate.adapter';
import { BILLING_ADAPTER } from './adapters/billing-adapter.token';
import { EditionService } from '../../config/edition/edition.service';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { PaymentController } from './payment.controller';
import { EntitlementsService } from './entitlements.service';
import { EntitlementsController } from './entitlements.controller';
import { EntitlementGuard } from './guards/entitlement.guard';
import { LicenseService } from './license/license.service';
import { LicenseController } from './license/license.controller';
import { PAYMENT_PORT } from './payment/payment.port';
import { FakePaymentDriver } from './payment/fake-payment.driver';
import { ZarinpalPaymentDriver } from './payment/zarinpal-payment.driver';
import { PaymentIdempotencyLock } from './payment/payment-idempotency.lock';
import { TrialFirstBusinessHook } from './trial-first-business.hook';
import { TenancyModule } from '../tenancy/tenancy.module';
import { IdentityModule } from '../identity/identity.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    IdentityModule,
    forwardRef(() => TenancyModule),
    forwardRef(() => AuditModule),
  ],
  controllers: [
    SubscriptionController,
    CatalogController,
    CheckoutController,
    PaymentController,
    EntitlementsController,
    LicenseController,
  ],
  providers: [
    PlatformBillingAdapter,
    LicenseGateAdapter,
    LicenseService,
    SubscriptionService,
    CatalogService,
    CheckoutService,
    EntitlementsService,
    EntitlementGuard,
    TrialFirstBusinessHook,
    FakePaymentDriver,
    ZarinpalPaymentDriver,
    PaymentIdempotencyLock,
    {
      provide: BILLING_ADAPTER,
      inject: [EditionService, PlatformBillingAdapter, LicenseGateAdapter],
      useFactory: (
        edition: EditionService,
        platform: PlatformBillingAdapter,
        license: LicenseGateAdapter,
      ) => (edition.isSaas() ? platform : license),
    },
    {
      provide: PAYMENT_PORT,
      inject: [ConfigService, FakePaymentDriver, ZarinpalPaymentDriver],
      useFactory: (
        config: ConfigService,
        fake: FakePaymentDriver,
        zarinpal: ZarinpalPaymentDriver,
      ) =>
        config.getOrThrow<'fake' | 'zarinpal'>('PAYMENT_PROVIDER') === 'zarinpal'
          ? zarinpal
          : fake,
    },
  ],
  exports: [
    BILLING_ADAPTER,
    SubscriptionService,
    CatalogService,
    CheckoutService,
    EntitlementsService,
    EntitlementGuard,
    LicenseService,
    TrialFirstBusinessHook,
  ],
})
export class BillingModule {}
