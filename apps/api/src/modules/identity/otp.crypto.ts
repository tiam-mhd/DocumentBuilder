import { createHash, randomInt, timingSafeEqual } from 'crypto';

export function generateOtpCode(length = 6): string {
  const max = 10 ** length;
  const value = randomInt(0, max);
  return value.toString().padStart(length, '0');
}

export function hashOtp(code: string, pepper: string): string {
  return createHash('sha256').update(`${pepper}:${code}`).digest('hex');
}

export function otpHashesEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
