import { Injectable } from '@nestjs/common';
import { BillingAdapter } from './billing-adapter.token';

@Injectable()
export class PlatformBillingAdapter implements BillingAdapter {
  readonly kind = 'platform' as const;

  describe(): string {
    return 'SAAS platform billing (PaymentPort + checkout)';
  }

  supportsCheckout(): boolean {
    return true;
  }

  requiresInstallationLicense(): boolean {
    return false;
  }

  async assertInstallationLicensed(): Promise<void> {
    // SAAS: platform operates the install — no customer license gate.
  }
}
