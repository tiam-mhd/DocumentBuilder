import {
  AnalyticsDevice,
  type AnalyticsDeviceValue,
} from '@vdb/shared-types';

/** Coarse device class from User-Agent — never persist the raw string. */
export function classifyDevice(uaRaw: string | undefined | null): AnalyticsDeviceValue {
  const ua = (uaRaw ?? '').toLowerCase();
  if (!ua) return AnalyticsDevice.Unknown;
  if (
    /bot|crawl|spider|slurp|facebookexternalhit|preview|headless/i.test(ua)
  ) {
    return AnalyticsDevice.Bot;
  }
  if (/ipad|tablet|kindle|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
    return AnalyticsDevice.Tablet;
  }
  if (
    /mobi|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini/i.test(
      ua,
    )
  ) {
    return AnalyticsDevice.Mobile;
  }
  return AnalyticsDevice.Desktop;
}

/** Prefer CDN / reverse-proxy country headers; never store client IP. */
export function extractCountry(
  headers: Record<string, string | string[] | undefined>,
): string | null {
  const raw =
    headerValue(headers, 'cf-ipcountry') ??
    headerValue(headers, 'x-vercel-ip-country') ??
    headerValue(headers, 'x-country-code') ??
    headerValue(headers, 'x-vdb-country');
  if (!raw) return null;
  const c = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c) || c === 'XX' || c === 'T1') return null;
  return c;
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const v = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(v)) return v[0];
  return v;
}

export function analyticsHintsFromHeaders(
  headers: Record<string, string | string[] | undefined>,
): { country: string | null; device: AnalyticsDeviceValue } {
  const ua =
    headerValue(headers, 'user-agent') ??
    headerValue(headers, 'User-Agent');
  return {
    country: extractCountry(headers),
    device: classifyDevice(ua),
  };
}
