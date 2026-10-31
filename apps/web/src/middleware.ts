import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './shared/i18n/routing';
import { ACCESS_TOKEN_COOKIE } from './shared/lib/auth-storage';

const intlMiddleware = createMiddleware(routing);

const PROTECTED_SEGMENTS = new Set(['app']);

function useRelativeLocation(response: NextResponse, requestUrl: string) {
  const location = response.headers.get('location');
  if (!location) return response;

  const target = new URL(location, requestUrl);
  response.headers.set(
    'location',
    `${target.pathname}${target.search}${target.hash}`,
  );
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
      return useRelativeLocation(NextResponse.redirect(login), request.url);
    }
  }

  return useRelativeLocation(intlMiddleware(request), request.url);
}

export const config = {
  matcher: ['/', '/(fa|en)/:path*'],
};
