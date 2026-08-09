import { apiFetch } from './client';
import type {
  PublicProject,
  PublicProjectCategory,
  PublicProjectCategoryList,
  PublicProjectList,
} from '@vdb/shared-types';

export function listProjectCategories(
  businessId: string,
  opts?: { page?: number; pageSize?: number },
) {
  const q = new URLSearchParams();
  if (opts?.page) q.set('page', String(opts.page));
  if (opts?.pageSize) q.set('pageSize', String(opts.pageSize));
  const qs = q.toString();
  return apiFetch<PublicProjectCategoryList>(
    `/businesses/${businessId}/project-categories${qs ? `?${qs}` : ''}`,
  );
}

export function createProjectCategory(
  businessId: string,
  body: {
    name: string;
    sortOrder?: number;
    translations?: { en?: Record<string, string> };
  },
) {
  return apiFetch<PublicProjectCategory>(
    `/businesses/${businessId}/project-categories`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export function updateProjectCategory(
  businessId: string,
  categoryId: string,
  body: {
    name?: string;
    sortOrder?: number;
    translations?: { en?: Record<string, string> };
  },
) {
  return apiFetch<PublicProjectCategory>(
    `/businesses/${businessId}/project-categories/${categoryId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export function deleteProjectCategory(businessId: string, categoryId: string) {
  return apiFetch<{ ok: true }>(
    `/businesses/${businessId}/project-categories/${categoryId}`,
    { method: 'DELETE' },
  );
}

export function listProjects(
  businessId: string,
  opts?: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: string;
    categoryId?: string;
  },
) {
  const q = new URLSearchParams();
  if (opts?.page) q.set('page', String(opts.page));
  if (opts?.pageSize) q.set('pageSize', String(opts.pageSize));
  if (opts?.q) q.set('q', opts.q);
  if (opts?.status) q.set('status', opts.status);
  if (opts?.categoryId) q.set('categoryId', opts.categoryId);
  const qs = q.toString();
  return apiFetch<PublicProjectList>(
    `/businesses/${businessId}/projects${qs ? `?${qs}` : ''}`,
  );
}

export function getProject(businessId: string, projectId: string) {
  return apiFetch<PublicProject>(
    `/businesses/${businessId}/projects/${projectId}`,
  );
}

export function createProject(
  businessId: string,
  body: {
    title: string;
    description?: string;
    categoryId?: string | null;
    status?: string;
    coverMediaId?: string | null;
    mediaIds?: string[];
    locationId?: string | null;
    fields?: Record<string, unknown>;
    translations?: { en?: Record<string, string> };
  },
) {
  return apiFetch<PublicProject>(`/businesses/${businessId}/projects`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateProject(
  businessId: string,
  projectId: string,
  body: {
    title?: string;
    description?: string;
    categoryId?: string | null;
    status?: string;
    coverMediaId?: string | null;
    mediaIds?: string[];
    locationId?: string | null;
    fields?: Record<string, unknown>;
    translations?: { en?: Record<string, string> };
  },
) {
  return apiFetch<PublicProject>(
    `/businesses/${businessId}/projects/${projectId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export function deleteProject(businessId: string, projectId: string) {
  return apiFetch<{ ok: true }>(
    `/businesses/${businessId}/projects/${projectId}`,
    { method: 'DELETE' },
  );
}
