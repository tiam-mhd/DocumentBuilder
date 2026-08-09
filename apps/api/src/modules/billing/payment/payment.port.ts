export const PAYMENT_PORT = Symbol('PAYMENT_PORT');

export type CreateCheckoutInput = {
  amount: number;
  currency: string;
  description: string;
  /** Absolute URL the gateway redirects to after payment. */
  callbackUrl: string;
  metadata: Record<string, string>;
};

export type CreateCheckoutResult = {
  gatewayRef: string;
  redirectUrl: string;
};

export type VerifyPaymentInput = {
  gatewayRef: string;
  amount: number;
};

export type VerifyPaymentResult = {
  ok: boolean;
  providerRef?: string;
};

/**
 * Payment gateway port — fake (dev) or Zarinpal (SAAS).
 * Wired only when APP_EDITION=SAAS; SELF_HOSTED uses LicenseGate.
 */
export interface PaymentPort {
  readonly provider: 'fake' | 'zarinpal';
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
}
