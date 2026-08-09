import { apiFetch } from './client';
import type {
  PublicBlockRegistry,
  PublicDocumentTemplate,
  PublicDocumentTemplateDetail,
  PublicDocumentTemplateList,
} from '@vdb/shared-types';

export function fetchBlockRegistry(businessId: string) {
  return apiFetch<PublicBlockRegistry>(`/businesses/${businessId}/blocks`);
}

export function listTemplates(
  businessId: string,
  opts?: { page?: number; pageSize?: number; q?: string },
) {
  const params = new URLSearchParams();
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.pageSize) params.set('pageSize', String(opts.pageSize));
  if (opts?.q) params.set('q', opts.q);
  const qs = params.toString();
  return apiFetch<PublicDocumentTemplateList>(
    `/businesses/${businessId}/templates${qs ? `?${qs}` : ''}`,
  );
}

export function getTemplate(businessId: string, templateId: string) {
  return apiFetch<PublicDocumentTemplateDetail>(
    `/businesses/${businessId}/templates/${templateId}`,
  );
}

export function createTemplate(
  businessId: string,
  body: {
    name: string;
    description?: string;
    themeId?: string | null;
  },
) {
  return apiFetch<PublicDocumentTemplateDetail>(
    `/businesses/${businessId}/templates`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

export function deleteTemplate(businessId: string, templateId: string) {
  return apiFetch<{ ok: true }>(
    `/businesses/${businessId}/templates/${templateId}`,
    { method: 'DELETE' },
  );
}

export type { PublicDocumentTemplate };
