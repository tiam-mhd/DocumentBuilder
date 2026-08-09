import { createHash, createHmac, timingSafeEqual } from 'crypto';

const DEV_KEY_RE = /^VDB-[A-Za-z0-9-]{16,}$/i;

export function normalizeLicenseKey(raw: string): string {
  return raw.trim().replace(/\s+/g, '');
}

export function hashLicenseKey(key: string, pepper: string): string {
  return createHash('sha256')
    .update(`${pepper}:${normalizeLicenseKey(key)}`)
    .digest('hex');
}

export function licenseKeyHint(key: string): string {
  const normalized = normalizeLicenseKey(key);
  if (normalized.length <= 4) return normalized;
  return normalized.slice(-4);
}

/**
 * Signed key: `VDB1.<base64url(payloadJson)>.<base64url(hmacSha256)>`
 * Payload may include `{ "exp": <unix_ms>, "org": "..." }`.
 * When issuerSecret is empty, accept opaque `VDB-...` keys (local SELF_HOSTED only).
 */
export function verifyLicenseKeyFormat(
  rawKey: string,
  issuerSecret: string,
): { ok: true; expiresAt: Date | null; organizationName?: string } | { ok: false } {
  const key = normalizeLicenseKey(rawKey);
  if (!key) return { ok: false };

  if (issuerSecret.trim()) {
    const parts = key.split('.');
    if (parts.length !== 3 || parts[0] !== 'VDB1') return { ok: false };
    const [, payloadB64, sigB64] = parts;
    try {
      const payloadBuf = Buffer.from(payloadB64!, 'base64url');
      const expected = createHmac('sha256', issuerSecret)
        .update(payloadBuf)
        .digest();
      const actual = Buffer.from(sigB64!, 'base64url');
      if (
        expected.length !== actual.length ||
        !timingSafeEqual(expected, actual)
      ) {
        return { ok: false };
      }
      const payload = JSON.parse(payloadBuf.toString('utf8')) as {
        exp?: number;
        org?: string;
      };
      const expiresAt =
        typeof payload.exp === 'number' ? new Date(payload.exp) : null;
      if (expiresAt && expiresAt.getTime() < Date.now()) {
        return { ok: false };
      }
      return {
        ok: true,
        expiresAt,
        organizationName:
          typeof payload.org === 'string' ? payload.org : undefined,
      };
    } catch {
      return { ok: false };
    }
  }

  if (!DEV_KEY_RE.test(key)) return { ok: false };
  return { ok: true, expiresAt: null };
}
