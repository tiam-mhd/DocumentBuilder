import { apiFetch } from './client';
import type { PublicMapMarkerList } from '@vdb/shared-types';

export function listMapMarkers(
  businessId: string,
  opts?: { source?: string; country?: string },
) {
  const q = new URLSearchParams();
  if (opts?.source) q.set('source', opts.source);
  if (opts?.country) q.set('country', opts.country);
  const qs = q.toString();
  return apiFetch<PublicMapMarkerList>(
    `/businesses/${businessId}/map/markers${qs ? `?${qs}` : ''}`,
  );
}
