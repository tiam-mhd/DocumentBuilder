export const BILLING_ADAPTER = Symbol('BILLING_ADAPTER');

/**
 * Edition-agnostic billing/license surface.
 * SaaS → PlatformBilling (checkout); SELF_HOSTED → LicenseGate.
 */
export interface BillingAdapter {
  readonly kind: 'platform' | 'license';
  describe(): string;
  /** True only for SAAS platform billing path. */
  supportsCheckout(): boolean;
  /** True only for SELF_HOSTED install license path. */
  requiresInstallationLicense(): boolean;
  /** No-op on SAAS; throws LICENSE_REQUIRED when SELF_HOSTED and inactive. */
  assertInstallationLicensed(): Promise<void>;
}
