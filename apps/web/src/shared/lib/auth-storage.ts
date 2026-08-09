export const ACCESS_TOKEN_KEY = 'vdb_access_token';
export const ACCESS_TOKEN_COOKIE = 'vdb_access_token';

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredAccessToken(
  token: string,
  expiresInSeconds: number,
): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  const maxAge = Math.max(expiresInSeconds, 60);
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearStoredAccessToken(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
