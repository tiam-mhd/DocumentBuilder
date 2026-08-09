import { apiFetch } from './client';
import type { BillingCatalog } from '@vdb/shared-types';

export function fetchBillingCatalog() {
  return apiFetch<BillingCatalog>('/billing/catalog');
}
