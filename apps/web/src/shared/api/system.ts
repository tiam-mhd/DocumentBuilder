import { apiFetch } from './client';
import type { AppEdition } from '@vdb/shared-types';

export type HealthReport = {
  status: 'ok' | 'degraded';
  edition: string;
  checks: {
    postgres: 'up' | 'down';
    redis: 'up' | 'down';
    mongo: 'up' | 'down';
  };
};

export type PublicSystemConfig = {
  edition: AppEdition;
  publicSignup: boolean;
  showPoweredBy: boolean;
  trialEnabledByDefault: boolean;
  platformCheckout: boolean;
  licenseActivation: boolean;
  licenseActive: boolean;
  templateMarketplace: boolean;
  platformAdminConsole: boolean;
};

export function fetchHealth() {
  return apiFetch<HealthReport>('/health');
}

export function fetchSystemConfig() {
  return apiFetch<PublicSystemConfig>('/system/config');
}
