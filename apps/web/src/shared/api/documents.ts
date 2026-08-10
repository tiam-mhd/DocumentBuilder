import { apiFetch } from './client';
import type {
  PublicDocument,
  PublicDocumentDetail,
  PublicDocumentList,
  PublicDocumentVersion,
  PublicDocumentVersionCompare,
  PublicDocumentVersionDetail,
  PublicDocumentVersionList,
} from '@vdb/shared-types';

export function listDocuments(
  businessId: string,
  opts?: { page?: number; pageSize?: number; q?: string; status?: string },
) {
  const params = new URLSearchParams();
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.pageSize) params.set('pageSize', String(opts.pageSize));
  if (opts?.q) params.set('q', opts.q);
  if (opts?.status) params.set('status', opts.status);
  const qs = params.toString();
  return apiFetch<PublicDocumentList>(
    `/businesses/${businessId}/documents${qs ? `?${qs}` : ''}`,
  );
}

export function getDocument(businessId: string, documentId: string) {
  return apiFetch<PublicDocumentDetail>(
    `/businesses/${businessId}/documents/${documentId}`,
  );
}

export function createDocument(
  businessId: string,
  body: { title: string; templateId: string; locale?: 'fa' | 'en' },
) {
  return apiFetch<PublicDocumentDetail>(
    `/businesses/${businessId}/documents`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

export function updateDocument(
  businessId: string,
  documentId: string,
  body: {
    title?: string;
    locale?: 'fa' | 'en';
    body?: unknown;
  },
) {
  return apiFetch<PublicDocumentDetail>(
    `/businesses/${businessId}/documents/${documentId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

export function submitDocumentReview(businessId: string, documentId: string) {
  return apiFetch<PublicDocumentDetail>(
    `/businesses/${businessId}/documents/${documentId}/workflow/submit`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  );
}

export function approveDocument(businessId: string, documentId: string) {
  return apiFetch<PublicDocumentDetail>(
    `/businesses/${businessId}/documents/${documentId}/workflow/approve`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  );
}

export function rejectDocument(
  businessId: string,
  documentId: string,
  note?: string,
) {
  return apiFetch<PublicDocumentDetail>(
    `/businesses/${businessId}/documents/${documentId}/workflow/reject`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    },
  );
}

export function publishDocument(businessId: string, documentId: string) {
  return apiFetch<PublicDocumentDetail>(
    `/businesses/${businessId}/documents/${documentId}/workflow/publish`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  );
}

export function unpublishDocument(businessId: string, documentId: string) {
  return apiFetch<PublicDocumentDetail>(
    `/businesses/${businessId}/documents/${documentId}/workflow/unpublish`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  );
}

export function reopenDocument(businessId: string, documentId: string) {
  return apiFetch<PublicDocumentDetail>(
    `/businesses/${businessId}/documents/${documentId}/workflow/reopen`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  );
}

export function deleteDocument(businessId: string, documentId: string) {
  return apiFetch<{ ok: true }>(
    `/businesses/${businessId}/documents/${documentId}`,
    { method: 'DELETE' },
  );
}

export function listDocumentVersions(businessId: string, documentId: string) {
  return apiFetch<PublicDocumentVersionList>(
    `/businesses/${businessId}/documents/${documentId}/versions`,
  );
}

export function createDocumentVersion(
  businessId: string,
  documentId: string,
  body?: { note?: string },
) {
  return apiFetch<PublicDocumentVersionDetail>(
    `/businesses/${businessId}/documents/${documentId}/versions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    },
  );
}

export function getDocumentVersion(
  businessId: string,
  documentId: string,
  versionId: string,
) {
  return apiFetch<PublicDocumentVersionDetail>(
    `/businesses/${businessId}/documents/${documentId}/versions/${versionId}`,
  );
}

export function compareDocumentVersions(
  businessId: string,
  documentId: string,
  left: string,
  right: string,
) {
  const q = new URLSearchParams({ left, right });
  return apiFetch<PublicDocumentVersionCompare>(
    `/businesses/${businessId}/documents/${documentId}/versions/compare?${q}`,
  );
}

export function restoreDocumentVersion(
  businessId: string,
  documentId: string,
  versionId: string,
) {
  return apiFetch<{ documentId: string }>(
    `/businesses/${businessId}/documents/${documentId}/versions/${versionId}/restore`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  );
}

export function cloneDocumentVersion(
  businessId: string,
  documentId: string,
  versionId: string,
  body?: { title?: string },
) {
  return apiFetch<{ documentId: string }>(
    `/businesses/${businessId}/documents/${documentId}/versions/${versionId}/clone`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    },
  );
}

export type {
  PublicDocument,
  PublicDocumentVersion,
  PublicDocumentVersionCompare,
};

export function listDocumentComments(
  businessId: string,
  documentId: string,
  opts?: { resolved?: 'all' | 'open' | 'resolved' },
) {
  const q = new URLSearchParams();
  if (opts?.resolved && opts.resolved !== 'all') {
    q.set('resolved', opts.resolved);
  }
  const qs = q.toString();
  return apiFetch<
    import('@vdb/shared-types').PublicDocumentCommentList
  >(
    `/businesses/${businessId}/documents/${documentId}/comments${qs ? `?${qs}` : ''}`,
  );
}

export function createDocumentComment(
  businessId: string,
  documentId: string,
  body: { body: string; pageId?: string | null; blockId?: string | null },
) {
  return apiFetch<import('@vdb/shared-types').PublicDocumentComment>(
    `/businesses/${businessId}/documents/${documentId}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

export function resolveDocumentComment(
  businessId: string,
  documentId: string,
  commentId: string,
) {
  return apiFetch<import('@vdb/shared-types').PublicDocumentComment>(
    `/businesses/${businessId}/documents/${documentId}/comments/${commentId}/resolve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    },
  );
}

export function unresolveDocumentComment(
  businessId: string,
  documentId: string,
  commentId: string,
) {
  return apiFetch<import('@vdb/shared-types').PublicDocumentComment>(
    `/businesses/${businessId}/documents/${documentId}/comments/${commentId}/unresolve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    },
  );
}

export function deleteDocumentComment(
  businessId: string,
  documentId: string,
  commentId: string,
) {
  return apiFetch<{ ok: true }>(
    `/businesses/${businessId}/documents/${documentId}/comments/${commentId}`,
    { method: 'DELETE' },
  );
}

export function fetchDocumentWebPublish(
  businessId: string,
  documentId: string,
) {
  return apiFetch<import('@vdb/shared-types').PublicDocumentWebPublish>(
    `/businesses/${businessId}/documents/${documentId}/web-publish`,
  );
}

export function updateDocumentWebPublish(
  businessId: string,
  documentId: string,
  body: { webSlug?: string | null; webPublished?: boolean },
) {
  return apiFetch<import('@vdb/shared-types').PublicDocumentWebPublish>(
    `/businesses/${businessId}/documents/${documentId}/web-publish`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

/** Unauthenticated public profile (server or client). */
export function fetchPublicWebDocument(businessId: string, slug: string) {
  return apiFetch<import('@vdb/shared-types').PublicWebDocumentView>(
    `/public/documents/${businessId}/${slug}`,
    { auth: false },
  );
}
