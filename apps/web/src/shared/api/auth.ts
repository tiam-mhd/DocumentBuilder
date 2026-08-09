import { apiFetch } from './client';
import type { AuthTokens, PublicUser } from '@vdb/shared-types';

export type RequestOtpResult = {
  mobile: string;
  expiresInSeconds: number;
  cooldownSeconds: number;
  devCode?: string;
};

export type VerifyOtpResult = {
  user: PublicUser;
  isNewUser: boolean;
} & AuthTokens;

export function requestOtp(mobile: string) {
  return apiFetch<RequestOtpResult>('/auth/otp/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile }),
    auth: false,
  });
}

export function verifyOtp(mobile: string, code: string) {
  return apiFetch<VerifyOtpResult>('/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile, code }),
    auth: false,
  });
}

export function fetchMe() {
  return apiFetch<PublicUser>('/auth/me');
}

export function logoutRequest() {
  return apiFetch<{ ok: true }>('/auth/logout', { method: 'POST' });
}
