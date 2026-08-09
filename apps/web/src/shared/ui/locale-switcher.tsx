'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { locales, type AppLocale } from '@/shared/i18n/routing';
import styles from './locale-switcher.module.css';

export function LocaleSwitcher() {
  const t = useTranslations('locale');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function onChange(next: AppLocale) {
    const segments = pathname.split('/');
    segments[1] = next;
    router.replace(segments.join('/') || `/${next}`);
  }

  return (
    <label className={styles.root}>
      <span className={styles.label}>{t('label')}</span>
      <select
        className={styles.select}
        value={locale}
        onChange={(event) => onChange(event.target.value as AppLocale)}
        aria-label={t('label')}
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {t(code)}
          </option>
        ))}
      </select>
    </label>
  );
}
