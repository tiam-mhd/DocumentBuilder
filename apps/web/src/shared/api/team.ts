import { apiFetch } from './client';
import type {
  PublicBranch,
  PublicBranchList,
  PublicTeamMember,
  PublicTeamMemberList,
} from '@vdb/shared-types';

export function listTeamMembers(
  businessId: string,
  opts?: { page?: number; pageSize?: number; q?: string; branchId?: string },
) {
  const q = new URLSearchParams();
  if (opts?.page) q.set('page', String(opts.page));
  if (opts?.pageSize) q.set('pageSize', String(opts.pageSize));
  if (opts?.q) q.set('q', opts.q);
  if (opts?.branchId) q.set('branchId', opts.branchId);
  const qs = q.toString();
  return apiFetch<PublicTeamMemberList>(
    `/businesses/${businessId}/team-members${qs ? `?${qs}` : ''}`,
  );
}

export function createTeamMember(
  businessId: string,
  body: {
    name: string;
    roleTitle?: string;
    department?: string;
    photoMediaId?: string | null;
    branchId?: string | null;
    parentMemberId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
  },
) {
  return apiFetch<PublicTeamMember>(
    `/businesses/${businessId}/team-members`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export function updateTeamMember(
  businessId: string,
  memberId: string,
  body: {
    name?: string;
    roleTitle?: string;
    department?: string;
    photoMediaId?: string | null;
    branchId?: string | null;
    parentMemberId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
  },
) {
  return apiFetch<PublicTeamMember>(
    `/businesses/${businessId}/team-members/${memberId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export function deleteTeamMember(businessId: string, memberId: string) {
  return apiFetch<{ ok: true }>(
    `/businesses/${businessId}/team-members/${memberId}`,
    { method: 'DELETE' },
  );
}

export function listBranches(
  businessId: string,
  opts?: { page?: number; pageSize?: number; q?: string },
) {
  const q = new URLSearchParams();
  if (opts?.page) q.set('page', String(opts.page));
  if (opts?.pageSize) q.set('pageSize', String(opts.pageSize));
  if (opts?.q) q.set('q', opts.q);
  const qs = q.toString();
  return apiFetch<PublicBranchList>(
    `/businesses/${businessId}/branches${qs ? `?${qs}` : ''}`,
  );
}

export function createBranch(
  businessId: string,
  body: {
    name: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
    locationId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
  },
) {
  return apiFetch<PublicBranch>(`/businesses/${businessId}/branches`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateBranch(
  businessId: string,
  branchId: string,
  body: {
    name?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
    locationId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
  },
) {
  return apiFetch<PublicBranch>(
    `/businesses/${businessId}/branches/${branchId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export function deleteBranch(businessId: string, branchId: string) {
  return apiFetch<{ ok: true }>(
    `/businesses/${businessId}/branches/${branchId}`,
    { method: 'DELETE' },
  );
}
