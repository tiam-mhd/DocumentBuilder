import { apiFetch } from './client';
import type {
  PublicDocumentShareLink,
  PublicDocumentShareLinkList,
  PublicShareLinkMeta,
  PublicShareLinkPdfView,
  PublicShareLinkWebView,
} from '@vdb/shared-types';

export function listDocumentShareLinks(
  businessId: string,
  documentId: string,
) {
  return apiFetch<PublicDocumentShareLinkList>(
    `/businesses/${businessId}/documents/${documentId}/share-links`,
  );
}

export function createDocumentShareLink(
  businessId: string,
  documentId: string,
  body: {
    scope: 'web' | 'pdf';
    password?: string | null;
    expiresAt?: string | null;
  },
) {
  return apiFetch<PublicDocumentShareLink>(
    `/businesses/${businessId}/documents/${documentId}/share-links`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

export function revokeDocumentShareLink(
  businessId: string,
  documentId: string,
  shareId: string,
) {
  return apiFetch<PublicDocumentShareLink>(
    `/businesses/${businessId}/documents/${documentId}/share-links/${shareId}/revoke`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    },
  );
}

export type PublicShareResolve =
  | { meta: PublicShareLinkMeta }
  | {
      meta: PublicShareLinkMeta;
      view: PublicShareLinkWebView | PublicShareLinkPdfView;
    };

export function resolveShareLink(token: string) {
  return apiFetch<PublicShareResolve>(
    `/public/share/${encodeURIComponent(token)}`,
    { auth: false },
  );
}

export function unlockShareLink(token: string, password: string) {
  return apiFetch<{
    meta: PublicShareLinkMeta;
    view: PublicShareLinkWebView | PublicShareLinkPdfView;
  }>(`/public/share/${encodeURIComponent(token)}/unlock`, {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}
