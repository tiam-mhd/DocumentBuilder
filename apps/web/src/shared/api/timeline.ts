import { apiFetch } from './client';
import type {
  PublicTimelineEvent,
  PublicTimelineEventList,
} from '@vdb/shared-types';

export function listTimelineEvents(
  businessId: string,
  opts?: { page?: number; pageSize?: number; q?: string },
) {
  const q = new URLSearchParams();
  if (opts?.page) q.set('page', String(opts.page));
  if (opts?.pageSize) q.set('pageSize', String(opts.pageSize));
  if (opts?.q) q.set('q', opts.q);
  const qs = q.toString();
  return apiFetch<PublicTimelineEventList>(
    `/businesses/${businessId}/timeline-events${qs ? `?${qs}` : ''}`,
  );
}

export function createTimelineEvent(
  businessId: string,
  body: {
    occurredAt: string;
    title: string;
    body?: string;
    mediaId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
    translations?: { en?: Record<string, string> };
  },
) {
  return apiFetch<PublicTimelineEvent>(
    `/businesses/${businessId}/timeline-events`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export function deleteTimelineEvent(businessId: string, eventId: string) {
  return apiFetch<{ ok: true }>(
    `/businesses/${businessId}/timeline-events/${eventId}`,
    { method: 'DELETE' },
  );
}
