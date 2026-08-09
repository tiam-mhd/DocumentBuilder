import { apiFetch } from './client';
import type {
  PublicGallery,
  PublicGalleryItem,
  PublicGalleryList,
} from '@vdb/shared-types';

function qs(opts?: { page?: number; pageSize?: number; q?: string }) {
  const q = new URLSearchParams();
  if (opts?.page) q.set('page', String(opts.page));
  if (opts?.pageSize) q.set('pageSize', String(opts.pageSize));
  if (opts?.q) q.set('q', opts.q);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function listGalleries(
  businessId: string,
  opts?: { page?: number; pageSize?: number; q?: string },
) {
  return apiFetch<PublicGalleryList>(
    `/businesses/${businessId}/galleries${qs(opts)}`,
  );
}

export function getGallery(businessId: string, galleryId: string) {
  return apiFetch<PublicGallery>(
    `/businesses/${businessId}/galleries/${galleryId}`,
  );
}

export function createGallery(
  businessId: string,
  body: { name: string; description?: string; sortOrder?: number },
) {
  return apiFetch<PublicGallery>(`/businesses/${businessId}/galleries`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateGallery(
  businessId: string,
  galleryId: string,
  body: { name?: string; description?: string; sortOrder?: number },
) {
  return apiFetch<PublicGallery>(
    `/businesses/${businessId}/galleries/${galleryId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export function deleteGallery(businessId: string, galleryId: string) {
  return apiFetch<{ ok: true }>(
    `/businesses/${businessId}/galleries/${galleryId}`,
    { method: 'DELETE' },
  );
}

export function addGalleryItem(
  businessId: string,
  galleryId: string,
  body: { mediaId: string; caption?: string; sortOrder?: number },
) {
  return apiFetch<PublicGalleryItem>(
    `/businesses/${businessId}/galleries/${galleryId}/items`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export function updateGalleryItem(
  businessId: string,
  galleryId: string,
  itemId: string,
  body: { mediaId?: string; caption?: string; sortOrder?: number },
) {
  return apiFetch<PublicGalleryItem>(
    `/businesses/${businessId}/galleries/${galleryId}/items/${itemId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export function deleteGalleryItem(
  businessId: string,
  galleryId: string,
  itemId: string,
) {
  return apiFetch<{ ok: true }>(
    `/businesses/${businessId}/galleries/${galleryId}/items/${itemId}`,
    { method: 'DELETE' },
  );
}

export function reorderGalleryItems(
  businessId: string,
  galleryId: string,
  itemIds: string[],
) {
  return apiFetch<PublicGallery>(
    `/businesses/${businessId}/galleries/${galleryId}/items/reorder`,
    { method: 'PUT', body: JSON.stringify({ itemIds }) },
  );
}
