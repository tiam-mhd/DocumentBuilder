import { apiFetch } from './client';
import type { PublicAnalyticsSummary } from '@vdb/shared-types';

export function fetchAnalyticsSummary(
  businessId: string,
  opts?: { from?: string; to?: string },
) {
  const params = new URLSearchParams();
  if (opts?.from) params.set('from', opts.from);
  if (opts?.to) params.set('to', opts.to);
  const qs = params.toString();
  return apiFetch<PublicAnalyticsSummary>(
    `/businesses/${businessId}/analytics/summary${qs ? `?${qs}` : ''}`,
  );
}
