import { apiFetch } from './client';
import type { PublicLocation, PublicLocationList } from '@vdb/shared-types';

function qs(opts?: { page?: number; pageSize?: number; q?: string }) {
  const q = new URLSearchParams();
  if (opts?.page) q.set('page', String(opts.page));
  if (opts?.pageSize) q.set('pageSize', String(opts.pageSize));
  if (opts?.q) q.set('q', opts.q);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function listLocations(
  businessId: string,
  opts?: { page?: number; pageSize?: number; q?: string },
) {
  return apiFetch<PublicLocationList>(
    `/businesses/${businessId}/locations${qs(opts)}`,
  );
}

export function createLocation(
  businessId: string,
  body: {
    name: string;
    country?: string;
    province?: string;
    city?: string;
    address?: string;
    lat: number;
    lng: number;
  },
) {
  return apiFetch<PublicLocation>(`/businesses/${businessId}/locations`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateLocation(
  businessId: string,
  locationId: string,
  body: {
    name?: string;
    country?: string;
    province?: string;
    city?: string;
    address?: string;
    lat?: number;
    lng?: number;
  },
) {
  return apiFetch<PublicLocation>(
    `/businesses/${businessId}/locations/${locationId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export function deleteLocation(businessId: string, locationId: string) {
  return apiFetch<{ ok: true }>(
    `/businesses/${businessId}/locations/${locationId}`,
    { method: 'DELETE' },
  );
}
