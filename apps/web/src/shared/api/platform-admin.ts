import { apiFetch } from './client';
import type {
  PublicPlatformAdminBusiness,
  PublicPlatformAdminBusinessList,
  PublicPlatformAdminFailedJobList,
  PublicPlatformAdminMe,
  PublicPlatformAdminSubscriptionList,
  PublicPlatformAdminUserList,
} from '@vdb/shared-types';

export function fetchPlatformAdminMe() {
  return apiFetch<PublicPlatformAdminMe>('/platform-admin/me');
}

export function listPlatformAdminUsers(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  if (params?.q) sp.set('q', params.q);
  const q = sp.toString();
  return apiFetch<PublicPlatformAdminUserList>(
    `/platform-admin/users${q ? `?${q}` : ''}`,
  );
}

export function listPlatformAdminBusinesses(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  suspended?: boolean;
}) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  if (params?.q) sp.set('q', params.q);
  if (params?.suspended === true) sp.set('suspended', 'true');
  if (params?.suspended === false) sp.set('suspended', 'false');
  const q = sp.toString();
  return apiFetch<PublicPlatformAdminBusinessList>(
    `/platform-admin/businesses${q ? `?${q}` : ''}`,
  );
}

export function suspendPlatformBusiness(businessId: string, reason?: string) {
  return apiFetch<PublicPlatformAdminBusiness>(
    `/platform-admin/businesses/${businessId}/suspend`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || undefined }),
    },
  );
}

export function unsuspendPlatformBusiness(businessId: string) {
  return apiFetch<PublicPlatformAdminBusiness>(
    `/platform-admin/businesses/${businessId}/unsuspend`,
    { method: 'POST' },
  );
}

export function listPlatformAdminSubscriptions(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  if (params?.status) sp.set('status', params.status);
  const q = sp.toString();
  return apiFetch<PublicPlatformAdminSubscriptionList>(
    `/platform-admin/subscriptions${q ? `?${q}` : ''}`,
  );
}

export function listPlatformAdminFailedJobs(params?: {
  page?: number;
  pageSize?: number;
}) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  const q = sp.toString();
  return apiFetch<PublicPlatformAdminFailedJobList>(
    `/platform-admin/jobs/failed${q ? `?${q}` : ''}`,
  );
}
