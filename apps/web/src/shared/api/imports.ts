import { apiFetch, ApiClientError, getApiBaseUrl } from './client';
import type {
  ImportColumnMapping,
  PublicImportJob,
} from '@vdb/shared-types';
import { getStoredAccessToken } from '@/shared/lib/auth-storage';

export async function uploadProjectsImport(
  businessId: string,
  file: File,
): Promise<PublicImportJob> {
  const token = getStoredAccessToken();
  const form = new FormData();
  form.append('file', file);
  const url = `${getApiBaseUrl()}/businesses/${businessId}/imports/projects/upload`;
  const response = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => null)) as
    | { data?: PublicImportJob; errors?: { code: string; message: string }[] }
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

export function getImportJob(businessId: string, importId: string) {
  return apiFetch<PublicImportJob>(
    `/businesses/${businessId}/imports/${importId}`,
  );
}

export function setImportMapping(
  businessId: string,
  importId: string,
  mapping: ImportColumnMapping,
) {
  return apiFetch<PublicImportJob>(
    `/businesses/${businessId}/imports/${importId}/mapping`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapping }),
    },
  );
}

export function commitImport(businessId: string, importId: string) {
  return apiFetch<PublicImportJob>(
    `/businesses/${businessId}/imports/${importId}/commit`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  );
}
