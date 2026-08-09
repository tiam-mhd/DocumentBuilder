import { Injectable } from '@nestjs/common';
import { BillingAdapter } from './billing-adapter.token';
import { LicenseService } from '../license/license.service';

@Injectable()
export class LicenseGateAdapter implements BillingAdapter {
  readonly kind = 'license' as const;

  constructor(private readonly licenses: LicenseService) {}

  describe(): string {
    return 'SELF_HOSTED license gate (installation_licenses)';
  }

  supportsCheckout(): boolean {
    return false;
  }

  requiresInstallationLicense(): boolean {
    return true;
  }

  async assertInstallationLicensed(): Promise<void> {
    await this.licenses.assertActive();
  }
}
