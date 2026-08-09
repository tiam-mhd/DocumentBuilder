import { apiFetch } from './client';
import type { PublicAuditEventList } from '@vdb/shared-types';

export function listAuditEvents(
  businessId: string,
  opts?: {
    page?: number;
    pageSize?: number;
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
  },
) {
  const params = new URLSearchParams();
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.pageSize) params.set('pageSize', String(opts.pageSize));
  if (opts?.action) params.set('action', opts.action);
  if (opts?.entityType) params.set('entityType', opts.entityType);
  if (opts?.from) params.set('from', opts.from);
  if (opts?.to) params.set('to', opts.to);
  const qs = params.toString();
  return apiFetch<PublicAuditEventList>(
    `/businesses/${businessId}/audit-events${qs ? `?${qs}` : ''}`,
  );
}
