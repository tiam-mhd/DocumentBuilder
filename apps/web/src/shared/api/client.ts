import type { ApiEnvelope, ApiErrorBody } from '@vdb/shared-types';
import { getStoredAccessToken } from '@/shared/lib/auth-storage';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  'http://localhost:3001/api';

export function getApiBaseUrl() {
  return API_URL;
}

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
};

export async function apiFetch<T>(
  path: string,
  init?: ApiFetchOptions,
): Promise<T> {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');

  if (init?.auth !== false) {
    const token = getStoredAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
      cache: 'no-store',
    });
  } catch {
    throw new ApiClientError('NETWORK_ERROR', 'Network error', 0);
  }

  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | { errors?: ApiErrorBody[] }
    | null;

  if (!response.ok) {
    const err = body && 'errors' in body ? body.errors?.[0] : undefined;
    throw new ApiClientError(
      err?.code ?? 'UNKNOWN',
      err?.message ?? 'Request failed',
      response.status,
    );
  }

  if (body && 'data' in body) {
    return body.data as T;
  }

  throw new ApiClientError('UNKNOWN', 'Invalid response shape', response.status);
}

export function mapApiErrorCode(
  code: string,
  translate: (key: string) => string,
): string {
  try {
    return translate(code);
  } catch {
    return translate('UNKNOWN');
  }
}
