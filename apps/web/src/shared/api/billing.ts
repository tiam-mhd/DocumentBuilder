import { apiFetch } from './client';
import type { CheckoutSession, PublicPayment, PublicSubscription } from '@vdb/shared-types';

export function startCheckout(
  businessId: string,
  body: { planCode: string; moduleCodes: string[] },
  idempotencyKey?: string,
) {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (idempotencyKey) {
    (headers as Record<string, string>)['Idempotency-Key'] = idempotencyKey;
  }
  return apiFetch<CheckoutSession>(`/businesses/${businessId}/billing/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

export function confirmPayment(body: {
  paymentId: string;
  gatewayRef?: string;
}) {
  return apiFetch<{
    payment: PublicPayment;
    subscription: PublicSubscription;
  }>('/billing/payments/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
