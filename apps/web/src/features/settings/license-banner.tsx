'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { fetchSystemConfig } from '@/shared/api/system';
import styles from './license-banner.module.css';

export function LicenseBanner() {
  const t = useTranslations('license');
  const locale = useLocale();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const config = await fetchSystemConfig();
        if (!cancelled) {
          setShow(config.licenseActivation && !config.licenseActive);
        }
      } catch {
        if (!cancelled) setShow(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) return null;

  return (
    <aside className={styles.banner} role="status">
      <p className={styles.title}>{t('bannerTitle')}</p>
      <p className={styles.body}>{t('bannerBody')}</p>
      <Link className={styles.cta} href={`/${locale}/app/license`}>
        {t('bannerCta')}
      </Link>
    </aside>
  );
}
