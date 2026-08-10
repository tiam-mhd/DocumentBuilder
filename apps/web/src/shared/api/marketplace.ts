import { apiFetch } from './client';
import type {
  PublicMarketplaceInstallResult,
  PublicMarketplaceTemplateDetail,
  PublicMarketplaceTemplateList,
} from '@vdb/shared-types';

export function listMarketplaceTemplates(
  businessId: string,
  opts?: { page?: number; pageSize?: number; q?: string; locale?: string },
) {
  const params = new URLSearchParams();
  params.set('businessId', businessId);
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.pageSize) params.set('pageSize', String(opts.pageSize));
  if (opts?.q) params.set('q', opts.q);
  if (opts?.locale) params.set('locale', opts.locale);
  return apiFetch<PublicMarketplaceTemplateList>(
    `/marketplace/templates?${params.toString()}`,
  );
}

export function getMarketplaceTemplate(
  businessId: string,
  templateId: string,
) {
  const params = new URLSearchParams({ businessId });
  return apiFetch<PublicMarketplaceTemplateDetail>(
    `/marketplace/templates/${templateId}?${params.toString()}`,
  );
}

export function installMarketplaceTemplate(
  businessId: string,
  marketplaceTemplateId: string,
) {
  return apiFetch<PublicMarketplaceInstallResult>(
    `/businesses/${businessId}/marketplace/templates/${marketplaceTemplateId}/install`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    },
  );
}
