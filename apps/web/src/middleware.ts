import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './shared/i18n/routing';
import { ACCESS_TOKEN_COOKIE } from './shared/lib/auth-storage';

const intlMiddleware = createMiddleware(routing);

const PROTECTED_SEGMENTS = new Set(['app']);

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
      return NextResponse.redirect(login);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(fa|en)/:path*'],
};
