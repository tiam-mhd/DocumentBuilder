import { apiFetch } from './client';
import type {
  DesignThemeTokens,
  PublicDesignTheme,
  PublicDesignThemeList,
} from '@vdb/shared-types';

export function listThemes(
  businessId: string,
  opts?: { page?: number; pageSize?: number },
) {
  const params = new URLSearchParams();
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.pageSize) params.set('pageSize', String(opts.pageSize));
  const qs = params.toString();
  return apiFetch<PublicDesignThemeList>(
    `/businesses/${businessId}/themes${qs ? `?${qs}` : ''}`,
  );
}

export function getDefaultTheme(businessId: string) {
  return apiFetch<PublicDesignTheme>(
    `/businesses/${businessId}/themes/default`,
  );
}

export function updateTheme(
  businessId: string,
  themeId: string,
  body: { name?: string; tokens?: DesignThemeTokens },
) {
  return apiFetch<PublicDesignTheme>(
    `/businesses/${businessId}/themes/${themeId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

export function createTheme(
  businessId: string,
  body: {
    name: string;
    tokens?: DesignThemeTokens;
    makeDefault?: boolean;
  },
) {
  return apiFetch<PublicDesignTheme>(`/businesses/${businessId}/themes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
