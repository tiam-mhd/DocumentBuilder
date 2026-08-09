import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentPort,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from './payment.port';

/** Dev/test driver — always succeeds verification for known authorities. */
@Injectable()
export class FakePaymentDriver implements PaymentPort {
  readonly provider = 'fake' as const;

  async createCheckout(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    const gatewayRef = `fake_${randomUUID().replace(/-/g, '')}`;
    const url = new URL(input.callbackUrl);
    url.searchParams.set('Authority', gatewayRef);
    url.searchParams.set('Status', 'OK');
    return {
      gatewayRef,
      redirectUrl: url.toString(),
    };
  }

  async verifyPayment(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult> {
    if (!input.gatewayRef.startsWith('fake_')) {
      return { ok: false };
    }
    return {
      ok: true,
      providerRef: `fake_ref_${input.gatewayRef.slice(5, 13)}`,
    };
  }
}
