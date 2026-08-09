'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/lib/auth-context';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(`/${locale}/login`);
    }
  }, [isAuthenticated, loading, locale, router]);

  if (loading || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
