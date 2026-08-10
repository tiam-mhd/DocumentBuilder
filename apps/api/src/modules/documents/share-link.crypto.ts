import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export function generateShareToken(): string {
  return randomBytes(24).toString('base64url');
}

export function hashShareSecret(value: string, pepper: string): string {
  return createHash('sha256').update(`${pepper}:${value}`).digest('hex');
}

export function shareHashesEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function shareTokenHint(token: string): string {
  return token.slice(-4);
}
