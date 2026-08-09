import { apiFetch, getApiBaseUrl } from './client';
import type { PublicExportJob } from '@vdb/shared-types';
import { getStoredAccessToken } from '@/shared/lib/auth-storage';

export function createPdfExport(businessId: string, documentId: string) {
  return apiFetch<PublicExportJob>(
    `/businesses/${businessId}/documents/${documentId}/export/pdf`,
    { method: 'POST' },
  );
}

export function getExportJob(businessId: string, jobId: string) {
  return apiFetch<PublicExportJob>(
    `/businesses/${businessId}/exports/${jobId}`,
  );
}

export function listDocumentExports(
  businessId: string,
  documentId: string,
) {
  return apiFetch<{
    items: PublicExportJob[];
    page: number;
    pageSize: number;
    total: number;
  }>(`/businesses/${businessId}/documents/${documentId}/exports`);
}

/** Trigger browser download of completed PDF (auth header via fetch blob). */
export async function downloadExportPdf(
  businessId: string,
  jobId: string,
  filename = 'document.pdf',
) {
  const token = getStoredAccessToken();
  const res = await fetch(
    `${getApiBaseUrl()}/businesses/${businessId}/exports/${jobId}/file`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: 'no-store',
    },
  );
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
