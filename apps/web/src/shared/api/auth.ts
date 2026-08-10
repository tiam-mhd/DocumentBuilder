import { apiFetch } from './client';
import type {
  AuthTokens,
  LoginOptions,
  PublicUser,
} from '@vdb/shared-types';

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

export type PasswordLoginResult =
  | VerifyOtpResult
  | {
      requiresOtp: true;
      challengeToken: string;
      mobile: string;
      expiresInSeconds: number;
      cooldownSeconds: number;
      devCode?: string;
    };

export function fetchLoginOptions(mobile: string) {
  return apiFetch<LoginOptions>('/auth/login/options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile }),
    auth: false,
  });
}

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

export function loginWithPassword(mobile: string, password: string) {
  return apiFetch<PasswordLoginResult>('/auth/password/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile, password }),
    auth: false,
  });
}

export function verifyTwoFactor(challengeToken: string, code: string) {
  return apiFetch<VerifyOtpResult>('/auth/2fa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeToken, code }),
    auth: false,
  });
}

export function setPassword(password: string, currentPassword?: string) {
  return apiFetch<PublicUser>('/auth/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, currentPassword }),
  });
}

export function setTwoFactorEnabled(enabled: boolean) {
  return apiFetch<PublicUser>('/auth/2fa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
}

export function updateProfile(input: {
  displayName?: string | null;
  email?: string | null;
  jobTitle?: string | null;
  bio?: string | null;
}) {
  return apiFetch<PublicUser>('/auth/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function fetchMe() {
  return apiFetch<PublicUser>('/auth/me');
}

export function logoutRequest() {
  return apiFetch<{ ok: true }>('/auth/logout', { method: 'POST' });
}
