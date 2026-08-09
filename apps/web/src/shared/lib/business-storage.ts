import { ACTIVE_BUSINESS_COOKIE } from '@vdb/shared-types';

export function getActiveBusinessId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_BUSINESS_COOKIE);
}

export function setActiveBusinessId(businessId: string): void {
  window.localStorage.setItem(ACTIVE_BUSINESS_COOKIE, businessId);
  document.cookie = `${ACTIVE_BUSINESS_COOKIE}=${encodeURIComponent(businessId)}; path=/; max-age=31536000; SameSite=Lax`;
}

export function clearActiveBusinessId(): void {
  window.localStorage.removeItem(ACTIVE_BUSINESS_COOKIE);
  document.cookie = `${ACTIVE_BUSINESS_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
