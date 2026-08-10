'use client';

import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/lib/auth-context';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('auth');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(`/${locale}/login`);
    }
  }, [isAuthenticated, loading, locale, router]);

  if (loading || !isAuthenticated) {
    return (
      <p style={{ margin: 0, color: 'var(--fg-muted)', padding: '2rem' }}>
        {t('loading')}
      </p>
    );
  }

  return <>{children}</>;
}

/** Send signed-in users away from auth screens to the panel home. */
export function RedirectIfAuthenticated({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('auth');

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(`/${locale}/app`);
    }
  }, [isAuthenticated, loading, locale, router]);

  if (loading) {
    return (
      <p style={{ margin: 0, color: 'var(--fg-muted)' }}>{t('loading')}</p>
    );
  }
  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
