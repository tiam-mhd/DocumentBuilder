import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingErrorCodes } from '@vdb/shared-types';
import { DomainException } from '../../../common/errors/domain.exception';
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentPort,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from './payment.port';

type ZarinpalRequestResponse = {
  data?: { code?: number; authority?: string; message?: string };
  errors?: unknown;
};

type ZarinpalVerifyResponse = {
  data?: { code?: number; ref_id?: number | string; message?: string };
  errors?: unknown;
};

@Injectable()
export class ZarinpalPaymentDriver implements PaymentPort {
  readonly provider = 'zarinpal' as const;

  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    const sandbox = this.config.getOrThrow<boolean>('ZARINPAL_SANDBOX');
    return sandbox
      ? 'https://sandbox.zarinpal.com/pg/v4/payment'
      : 'https://payment.zarinpal.com/pg/v4/payment';
  }

  private startPayBase(): string {
    const sandbox = this.config.getOrThrow<boolean>('ZARINPAL_SANDBOX');
    return sandbox
      ? 'https://sandbox.zarinpal.com/pg/StartPay'
      : 'https://www.zarinpal.com/pg/StartPay';
  }

  async createCheckout(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    const merchantId = this.config.getOrThrow<string>('ZARINPAL_MERCHANT_ID');
    const res = await fetch(`${this.baseUrl()}/request.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: input.amount,
        currency: input.currency === 'IRR' ? 'IRR' : 'IRT',
        description: input.description,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
    });

    const body = (await res.json()) as ZarinpalRequestResponse;
    const authority = body.data?.authority;
    const code = body.data?.code;
    if (!authority || code !== 100) {
      throw new DomainException(
        BillingErrorCodes.PaymentProviderError,
        body.data?.message ?? 'Zarinpal request failed',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return {
      gatewayRef: authority,
      redirectUrl: `${this.startPayBase()}/${authority}`,
    };
  }

  async verifyPayment(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult> {
    const merchantId = this.config.getOrThrow<string>('ZARINPAL_MERCHANT_ID');
    const res = await fetch(`${this.baseUrl()}/verify.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: input.amount,
        authority: input.gatewayRef,
      }),
    });

    const body = (await res.json()) as ZarinpalVerifyResponse;
    const code = body.data?.code;
    // 100 = first verify success; 101 = already verified (idempotent OK)
    if (code !== 100 && code !== 101) {
      return { ok: false };
    }
    return {
      ok: true,
      providerRef: body.data?.ref_id != null ? String(body.data.ref_id) : undefined,
    };
  }
}
