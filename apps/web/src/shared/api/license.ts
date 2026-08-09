import { apiFetch } from './client';
import type { PublicInstallationLicense } from '@vdb/shared-types';

export function fetchInstallationLicense() {
  return apiFetch<PublicInstallationLicense>('/system/license', {
    auth: false,
  });
}

export function activateInstallationLicense(body: {
  licenseKey: string;
  organizationName?: string;
}) {
  return apiFetch<PublicInstallationLicense>('/system/license/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
