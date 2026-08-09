import { apiFetch } from './client';
import type { PublicBusiness } from '@vdb/shared-types';

export function listBusinesses() {
  return apiFetch<PublicBusiness[]>('/businesses');
}

export function createBusiness(name: string) {
  return apiFetch<PublicBusiness>('/businesses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export function getBusiness(businessId: string) {
  return apiFetch<PublicBusiness>(`/businesses/${businessId}`);
}

export function updateBusiness(businessId: string, name: string) {
  return apiFetch<PublicBusiness>(`/businesses/${businessId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export function deleteBusiness(businessId: string) {
  return apiFetch<{ ok: true }>(`/businesses/${businessId}`, {
    method: 'DELETE',
  });
}
