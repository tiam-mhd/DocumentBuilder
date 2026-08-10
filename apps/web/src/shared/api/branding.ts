import type { PublicBrandingResolve, PublicBusinessBranding } from '@vdb/shared-types';
import { apiFetch, getApiBaseUrl } from './client';
import { getStoredAccessToken } from '@/shared/lib/auth-storage';

export function fetchBranding(businessId: string) {
  return apiFetch<PublicBusinessBranding>(
    `/businesses/${businessId}/branding`,
  );
}

export function updateBranding(
  businessId: string,
  body: {
    displayName?: string | null;
    primaryColor?: string | null;
    customDomain?: string | null;
    hidePoweredBy?: boolean;
  },
) {
  return apiFetch<PublicBusinessBranding>(
    `/businesses/${businessId}/branding`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

export async function uploadBrandingLogo(businessId: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  const token = getStoredAccessToken();
  const res = await fetch(
    `${getApiBaseUrl()}/businesses/${businessId}/branding/logo`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
      cache: 'no-store',
    },
  );
  const body = (await res.json().catch(() => null)) as {
    data?: PublicBusinessBranding;
    errors?: { code: string; message: string }[];
  } | null;
  if (!res.ok) {
    const err = body?.errors?.[0];
    const { ApiClientError } = await import('./client');
    throw new ApiClientError(
      err?.code ?? 'UNKNOWN',
      err?.message ?? 'Upload failed',
      res.status,
    );
  }
  if (!body?.data) {
    const { ApiClientError } = await import('./client');
    throw new ApiClientError('UNKNOWN', 'Invalid response', res.status);
  }
  return body.data;
}

export function deleteBrandingLogo(businessId: string) {
  return apiFetch<PublicBusinessBranding>(
    `/businesses/${businessId}/branding/logo`,
    { method: 'DELETE' },
  );
}

export function resolveBrandingByHost(host: string) {
  return apiFetch<PublicBrandingResolve>(
    `/branding/resolve?host=${encodeURIComponent(host)}`,
    { auth: false },
  );
}

export function brandingLogoAbsoluteUrl(
  businessId: string,
  hasLogo: boolean,
): string | null {
  if (!hasLogo) return null;
  return `${getApiBaseUrl()}/businesses/${businessId}/branding/logo/file`;
}
