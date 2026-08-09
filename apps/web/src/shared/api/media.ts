import { ApiClientError, apiFetch, getApiBaseUrl } from './client';
import type { PublicMediaAsset, PublicMediaList } from '@vdb/shared-types';
import { getStoredAccessToken } from '@/shared/lib/auth-storage';

export function listMedia(
  businessId: string,
  opts?: { page?: number; pageSize?: number; q?: string },
) {
  const params = new URLSearchParams();
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.pageSize) params.set('pageSize', String(opts.pageSize));
  if (opts?.q) params.set('q', opts.q);
  const qs = params.toString();
  return apiFetch<PublicMediaList>(
    `/businesses/${businessId}/media${qs ? `?${qs}` : ''}`,
  );
}

export async function uploadMedia(businessId: string, file: File) {
  const token = getStoredAccessToken();
  const form = new FormData();
  form.append('file', file);
  const url = `${getApiBaseUrl()}/businesses/${businessId}/media/upload`;
  const response = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => null)) as
    | { data?: PublicMediaAsset; errors?: { code: string; message: string }[] }
    | null;
  if (!response.ok) {
    const err = body?.errors?.[0];
    throw new ApiClientError(
      err?.code ?? 'UNKNOWN',
      err?.message ?? 'Upload failed',
      response.status,
    );
  }
  if (!body?.data) {
    throw new ApiClientError('UNKNOWN', 'Invalid response', response.status);
  }
  return body.data;
}

export function deleteMedia(businessId: string, assetId: string) {
  return apiFetch<{ ok: true }>(`/businesses/${businessId}/media/${assetId}`, {
    method: 'DELETE',
  });
}

export async function fetchMediaBlobUrl(relativePath: string): Promise<string> {
  const token = getStoredAccessToken();
  const url = `${getApiBaseUrl()}${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}`;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Failed to load media');
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
