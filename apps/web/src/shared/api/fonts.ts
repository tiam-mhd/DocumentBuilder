import { ApiClientError, apiFetch, getApiBaseUrl } from './client';
import type { PublicFontFace, PublicFontList } from '@vdb/shared-types';
import { getStoredAccessToken } from '@/shared/lib/auth-storage';

export function listFonts(
  businessId: string,
  opts?: { page?: number; pageSize?: number; q?: string },
) {
  const params = new URLSearchParams();
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.pageSize) params.set('pageSize', String(opts.pageSize));
  if (opts?.q) params.set('q', opts.q);
  const qs = params.toString();
  return apiFetch<PublicFontList>(
    `/businesses/${businessId}/fonts${qs ? `?${qs}` : ''}`,
  );
}

export async function uploadFont(
  businessId: string,
  input: {
    file: File;
    family: string;
    weight: number;
    style: 'normal' | 'italic';
  },
) {
  const token = getStoredAccessToken();
  const form = new FormData();
  form.append('file', input.file);
  form.append('family', input.family);
  form.append('weight', String(input.weight));
  form.append('style', input.style);
  const url = `${getApiBaseUrl()}/businesses/${businessId}/fonts/upload`;
  const response = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => null)) as
    | { data?: PublicFontFace; errors?: { code: string; message: string }[] }
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

export function deleteFont(businessId: string, fontId: string) {
  return apiFetch<{ ok: true }>(`/businesses/${businessId}/fonts/${fontId}`, {
    method: 'DELETE',
  });
}
