import { apiFetch } from './client';
import type {
  PublicDocument,
  PublicDocumentDetail,
  PublicDocumentList,
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
  body: { title: string; templateId: string },
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
    status?: 'draft' | 'published';
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

export function deleteDocument(businessId: string, documentId: string) {
  return apiFetch<{ ok: true }>(
    `/businesses/${businessId}/documents/${documentId}`,
    { method: 'DELETE' },
  );
}

export type { PublicDocument };
