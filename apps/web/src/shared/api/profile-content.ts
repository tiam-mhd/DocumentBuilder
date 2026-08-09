import { apiFetch } from './client';
import type {
  PublicBusinessService,
  PublicBusinessServiceList,
  PublicCertificate,
  PublicCertificateList,
  PublicClient,
  PublicClientList,
} from '@vdb/shared-types';

function qs(opts?: { page?: number; pageSize?: number; q?: string }) {
  const q = new URLSearchParams();
  if (opts?.page) q.set('page', String(opts.page));
  if (opts?.pageSize) q.set('pageSize', String(opts.pageSize));
  if (opts?.q) q.set('q', opts.q);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function listServices(
  businessId: string,
  opts?: { page?: number; pageSize?: number; q?: string },
) {
  return apiFetch<PublicBusinessServiceList>(
    `/businesses/${businessId}/services${qs(opts)}`,
  );
}

export function createService(
  businessId: string,
  body: {
    name: string;
    description?: string;
    iconMediaId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
    translations?: { en?: Record<string, string> };
  },
) {
  return apiFetch<PublicBusinessService>(
    `/businesses/${businessId}/services`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export function updateService(
  businessId: string,
  serviceId: string,
  body: {
    name?: string;
    description?: string;
    iconMediaId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
    translations?: { en?: Record<string, string> };
  },
) {
  return apiFetch<PublicBusinessService>(
    `/businesses/${businessId}/services/${serviceId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export function deleteService(businessId: string, serviceId: string) {
  return apiFetch<{ ok: true }>(
    `/businesses/${businessId}/services/${serviceId}`,
    { method: 'DELETE' },
  );
}

export function listClients(
  businessId: string,
  opts?: { page?: number; pageSize?: number; q?: string },
) {
  return apiFetch<PublicClientList>(
    `/businesses/${businessId}/clients${qs(opts)}`,
  );
}

export function createClient(
  businessId: string,
  body: {
    name: string;
    website?: string;
    logoMediaId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
    translations?: { en?: Record<string, string> };
  },
) {
  return apiFetch<PublicClient>(`/businesses/${businessId}/clients`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateClient(
  businessId: string,
  clientId: string,
  body: {
    name?: string;
    website?: string;
    logoMediaId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
    translations?: { en?: Record<string, string> };
  },
) {
  return apiFetch<PublicClient>(
    `/businesses/${businessId}/clients/${clientId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export function deleteClient(businessId: string, clientId: string) {
  return apiFetch<{ ok: true }>(
    `/businesses/${businessId}/clients/${clientId}`,
    { method: 'DELETE' },
  );
}

export function listCertificates(
  businessId: string,
  opts?: { page?: number; pageSize?: number; q?: string },
) {
  return apiFetch<PublicCertificateList>(
    `/businesses/${businessId}/certificates${qs(opts)}`,
  );
}

export function createCertificate(
  businessId: string,
  body: {
    name: string;
    issuer?: string;
    issuedAt?: string | null;
    expiresAt?: string | null;
    documentMediaId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
    translations?: { en?: Record<string, string> };
  },
) {
  return apiFetch<PublicCertificate>(
    `/businesses/${businessId}/certificates`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export function updateCertificate(
  businessId: string,
  certificateId: string,
  body: {
    name?: string;
    issuer?: string;
    issuedAt?: string | null;
    expiresAt?: string | null;
    documentMediaId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
    translations?: { en?: Record<string, string> };
  },
) {
  return apiFetch<PublicCertificate>(
    `/businesses/${businessId}/certificates/${certificateId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export function deleteCertificate(businessId: string, certificateId: string) {
  return apiFetch<{ ok: true }>(
    `/businesses/${businessId}/certificates/${certificateId}`,
    { method: 'DELETE' },
  );
}
