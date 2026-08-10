import type { PublicBusinessPermissions } from '@vdb/shared-types';
import { apiFetch } from './client';

export function fetchBusinessPermissions(businessId: string) {
  return apiFetch<PublicBusinessPermissions>(
    `/businesses/${businessId}/permissions`,
  );
}
