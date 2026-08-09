import { apiFetch } from './client';
import type { PublicCollectionList } from '@vdb/shared-types';

export function listCollection(
  businessId: string,
  source: string,
  opts?: { limit?: number },
) {
  const q = new URLSearchParams();
  if (opts?.limit) q.set('limit', String(opts.limit));
  const qs = q.toString();
  return apiFetch<PublicCollectionList>(
    `/businesses/${businessId}/collections/${encodeURIComponent(source)}${qs ? `?${qs}` : ''}`,
  );
}
