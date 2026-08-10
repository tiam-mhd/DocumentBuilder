import type {
  PublicBusinessInvitation,
  PublicBusinessMember,
  PublicInvitationPreview,
} from '@vdb/shared-types';
import { apiFetch } from './client';

export function listMembers(businessId: string) {
  return apiFetch<PublicBusinessMember[]>(`/businesses/${businessId}/members`);
}

export function updateMemberRole(
  businessId: string,
  userId: string,
  role: string,
) {
  return apiFetch<PublicBusinessMember>(
    `/businesses/${businessId}/members/${userId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    },
  );
}

export function removeMember(businessId: string, userId: string) {
  return apiFetch<{ ok: true }>(
    `/businesses/${businessId}/members/${userId}`,
    { method: 'DELETE' },
  );
}

export function listInvitations(businessId: string) {
  return apiFetch<PublicBusinessInvitation[]>(
    `/businesses/${businessId}/invitations`,
  );
}

export function createInvitation(
  businessId: string,
  body: { mobile: string; role: string },
) {
  return apiFetch<PublicBusinessInvitation>(
    `/businesses/${businessId}/invitations`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

export function revokeInvitation(businessId: string, invitationId: string) {
  return apiFetch<{ ok: true }>(
    `/businesses/${businessId}/invitations/${invitationId}`,
    { method: 'DELETE' },
  );
}

export function previewInvitation(token: string) {
  return apiFetch<PublicInvitationPreview>(
    `/invitations/${encodeURIComponent(token)}`,
    { auth: false },
  );
}

export function acceptInvitation(token: string) {
  return apiFetch<PublicBusinessMember>(
    `/invitations/${encodeURIComponent(token)}/accept`,
    { method: 'POST' },
  );
}

export function listMyPendingInvitations() {
  return apiFetch<PublicInvitationPreview[]>(`/me/invitations`);
}
