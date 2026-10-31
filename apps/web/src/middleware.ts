import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './shared/i18n/routing';
import { ACCESS_TOKEN_COOKIE } from './shared/lib/auth-storage';

const intlMiddleware = createMiddleware(routing);

const PROTECTED_SEGMENTS = new Set(['app']);

function getPublicOrigin(request: NextRequest) {
  const forwardedHost = request.headers
    .get('x-forwarded-host')
    ?.split(',')[0]
    ?.trim();
  const host = forwardedHost || request.headers.get('host');
  const forwardedProtocol = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim()
    .toLowerCase();
  const protocol =
    forwardedProtocol === 'http' || forwardedProtocol === 'https'
      ? forwardedProtocol
      : new URL(request.url).protocol.slice(0, -1);

  if (!host) return request.nextUrl.origin;

  try {
    const origin = new URL(`${protocol}://${host}`);
    if (
      origin.username ||
      origin.password ||
      origin.pathname !== '/' ||
      origin.search ||
      origin.hash
    ) {
      return request.nextUrl.origin;
    }
    return origin.origin;
  } catch {
    return request.nextUrl.origin;
  }
}

function usePublicOrigin(response: NextResponse, request: NextRequest) {
  const location = response.headers.get('location');
  if (!location) return response;

  const target = new URL(location, request.url);
  const publicTarget = new URL(
    `${target.pathname}${target.search}${target.hash}`,
    getPublicOrigin(request),
  );
  response.headers.set('location', publicTarget.toString());
  return response;
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  // /fa/app/... or /en/app/...
  const locale = segments[0];
  const maybeApp = segments[1];

  if (
    locale &&
    routing.locales.includes(locale as 'fa' | 'en') &&
    maybeApp &&
    PROTECTED_SEGMENTS.has(maybeApp)
  ) {
    const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    if (!token) {
      const login = new URL(`/${locale}/login`, request.url);
      login.searchParams.set('next', pathname);
      return usePublicOrigin(NextResponse.redirect(login), request);
    }
  }

  return usePublicOrigin(intlMiddleware(request), request);
}

export const config = {
  matcher: ['/', '/(fa|en)/:path*'],
};
