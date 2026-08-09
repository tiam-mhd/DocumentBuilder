import { apiFetch } from './client';
import type { PublicBusinessEntitlements } from '@vdb/shared-types';

export function fetchBusinessEntitlements(businessId: string) {
  return apiFetch<PublicBusinessEntitlements>(
    `/businesses/${businessId}/entitlements`,
  );
}
