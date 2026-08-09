import { apiFetch, ApiClientError, getApiBaseUrl } from './client';
import { getStoredAccessToken } from '@/shared/lib/auth-storage';
import type {
  PublicWorkspaceBackupJob,
  PublicWorkspaceRestoreJob,
} from '@vdb/shared-types';

export function createBackup(businessId: string) {
  return apiFetch<PublicWorkspaceBackupJob>(
    `/businesses/${businessId}/backups`,
    { method: 'POST' },
  );
}

export function listBackups(
  businessId: string,
  opts?: { page?: number; pageSize?: number },
) {
  const params = new URLSearchParams();
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.pageSize) params.set('pageSize', String(opts.pageSize));
  const qs = params.toString();
  return apiFetch<{
    items: PublicWorkspaceBackupJob[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/businesses/${businessId}/backups${qs ? `?${qs}` : ''}`);
}

export function getBackup(businessId: string, jobId: string) {
  return apiFetch<PublicWorkspaceBackupJob>(
    `/businesses/${businessId}/backups/${jobId}`,
  );
}

export async function downloadBackupFile(
  businessId: string,
  jobId: string,
): Promise<Blob> {
  const token = getStoredAccessToken();
  const res = await fetch(
    `${getApiBaseUrl()}/businesses/${businessId}/backups/${jobId}/file`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  if (!res.ok) {
    throw new ApiClientError('BACKUP_NOT_READY', 'Download failed', res.status);
  }
  return res.blob();
}

export async function uploadRestorePackage(
  businessId: string,
  file: File,
): Promise<PublicWorkspaceRestoreJob> {
  const token = getStoredAccessToken();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(
    `${getApiBaseUrl()}/businesses/${businessId}/restores/upload`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    },
  );
  const json = (await res.json().catch(() => null)) as {
    data?: PublicWorkspaceRestoreJob;
    errors?: { code?: string; message?: string }[];
  } | null;
  if (!res.ok) {
    throw new ApiClientError(
      json?.errors?.[0]?.code ?? 'UNKNOWN',
      json?.errors?.[0]?.message ?? 'Upload failed',
      res.status,
    );
  }
  if (!json?.data) {
    throw new ApiClientError('UNKNOWN', 'Invalid response', res.status);
  }
  return json.data;
}

export function getRestore(businessId: string, jobId: string) {
  return apiFetch<PublicWorkspaceRestoreJob>(
    `/businesses/${businessId}/restores/${jobId}`,
  );
}

export function commitRestore(
  businessId: string,
  jobId: string,
  confirmReplace: boolean,
) {
  return apiFetch<PublicWorkspaceRestoreJob>(
    `/businesses/${businessId}/restores/${jobId}/commit`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmReplace }),
    },
  );
}
