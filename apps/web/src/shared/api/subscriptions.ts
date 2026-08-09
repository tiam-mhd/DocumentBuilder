import { apiFetch } from './client';
import type { PublicSubscription } from '@vdb/shared-types';

export function fetchBusinessSubscription(businessId: string) {
  return apiFetch<PublicSubscription>(
    `/businesses/${businessId}/subscription`,
  );
}
