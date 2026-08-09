'use client';

import { useTranslations } from 'next-intl';
import { useBusinesses } from '@/shared/lib/business-context';
import styles from './business-switcher.module.css';

export function BusinessSwitcher() {
  const t = useTranslations('businesses');
  const { businesses, activeBusiness, selectBusiness, loading } =
    useBusinesses();

  if (loading) {
    return <span className={styles.muted}>{t('loading')}</span>;
  }

  if (businesses.length === 0) {
    return <span className={styles.muted}>{t('none')}</span>;
  }

  return (
    <label className={styles.root}>
      <span className={styles.label}>{t('switcherLabel')}</span>
      <select
        className={styles.select}
        value={activeBusiness?.id ?? ''}
        onChange={(event) => selectBusiness(event.target.value)}
        aria-label={t('switcherLabel')}
      >
        {businesses.map((business) => (
          <option key={business.id} value={business.id}>
            {business.name}
          </option>
        ))}
      </select>
    </label>
  );
}
