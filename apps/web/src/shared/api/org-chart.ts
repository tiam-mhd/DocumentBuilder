import { apiFetch } from './client';
import type { PublicOrgChartTree } from '@vdb/shared-types';

export function getOrgChartTree(
  businessId: string,
  opts?: { rootMemberId?: string | null; locale?: string },
) {
  const q = new URLSearchParams();
  if (opts?.rootMemberId) q.set('rootMemberId', opts.rootMemberId);
  if (opts?.locale) q.set('locale', opts.locale);
  const qs = q.toString();
  return apiFetch<PublicOrgChartTree>(
    `/businesses/${businessId}/org-chart/tree${qs ? `?${qs}` : ''}`,
  );
}
