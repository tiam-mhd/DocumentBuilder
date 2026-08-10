import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEYLEN = 64;

/** Format: scrypt$N$r$p$saltHex$hashHex */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = scryptSync(plain, salt, KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export async function verifyPassword(
  plain: string,
  encoded: string,
): Promise<boolean> {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], 'hex');
  const expected = Buffer.from(parts[5], 'hex');
  if (!salt.length || !expected.length || !N || !r || !p) {
    return false;
  }
  const derived = scryptSync(plain, salt, expected.length, { N, r, p });
  if (derived.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(derived, expected);
}

/** Min 8 chars, at least one letter and one digit. */
export function isPasswordStrongEnough(plain: string): boolean {
  if (plain.length < 8 || plain.length > 128) return false;
  return /[A-Za-z\u0600-\u06FF]/.test(plain) && /\d/.test(plain);
}
