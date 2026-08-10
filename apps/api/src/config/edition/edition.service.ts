import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppEdition } from '@vdb/shared-types';

export type PublicSystemConfig = {
  edition: AppEdition;
  publicSignup: boolean;
  showPoweredBy: boolean;
  trialEnabledByDefault: boolean;
  /** SAAS platform checkout; SELF_HOSTED uses license path instead. */
  platformCheckout: boolean;
  /** Show license activation UI (SELF_HOSTED only). */
  licenseActivation: boolean;
  /** SAAS template marketplace (ADR 029); false on SELF_HOSTED. */
  templateMarketplace: boolean;
  /** SAAS platform admin console UI hint (ADR 031); false on SELF_HOSTED. */
  platformAdminConsole: boolean;
};

/** Public system config returned by GET /system/config (includes live license flag). */
export type PublicSystemConfigResponse = PublicSystemConfig & {
  licenseActive: boolean;
};

@Injectable()
export class EditionService {
  constructor(private readonly config: ConfigService) {}

  getEdition(): AppEdition {
    return this.config.getOrThrow<AppEdition>('APP_EDITION');
  }

  isSaas(): boolean {
    return this.getEdition() === AppEdition.Saas;
  }

  isSelfHosted(): boolean {
    return this.getEdition() === AppEdition.SelfHosted;
  }

  /** Public, non-secret flags for the web app shell. */
  getPublicConfig(): PublicSystemConfig {
    const edition = this.getEdition();
    const isSaas = edition === AppEdition.Saas;
    return {
      edition,
      publicSignup: isSaas,
      showPoweredBy: isSaas,
      trialEnabledByDefault: isSaas,
      platformCheckout: isSaas,
      licenseActivation: !isSaas,
      templateMarketplace: isSaas,
      platformAdminConsole: isSaas,
    };
  }
}
