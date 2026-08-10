'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import styles from './auth-forms.module.css';

/** Legacy /verify → unified animated wizard on /login. */
export function VerifyForm({ locale }: { locale: string }) {
  const t = useTranslations('auth');
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${locale}/login`);
  }, [locale, router]);

  return <p className={styles.hint}>{t('loading')}</p>;
}
