import { apiFetch } from './client';
import type { PublicCollectionList } from '@vdb/shared-types';

export function listCollection(
  businessId: string,
  source: string,
  opts?: { limit?: number; locale?: string },
) {
  const q = new URLSearchParams();
  if (opts?.limit) q.set('limit', String(opts.limit));
  if (opts?.locale) q.set('locale', opts.locale);
  const qs = q.toString();
  return apiFetch<PublicCollectionList>(
    `/businesses/${businessId}/collections/${encodeURIComponent(source)}${qs ? `?${qs}` : ''}`,
  );
}
