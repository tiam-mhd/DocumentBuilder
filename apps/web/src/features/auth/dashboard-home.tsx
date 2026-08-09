'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useAuth } from '@/shared/lib/auth-context';
import { useBusinesses } from '@/shared/lib/business-context';
import { SubscriptionPanel } from '@/features/billing/subscription-panel';
import { EntitlementsPanel } from '@/features/billing/entitlements-panel';
import { LicenseBanner } from '@/features/settings/license-banner';
import styles from './dashboard.module.css';

export function DashboardHome() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const { user } = useAuth();
  const { activeBusiness, businesses } = useBusinesses();

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.hint}>{t('welcome', { mobile: user?.mobile ?? '' })}</p>
      <p className={styles.meta}>{t('userId', { id: user?.id ?? '' })}</p>
      <p className={styles.meta}>
        {activeBusiness
          ? t('activeBusiness', { name: activeBusiness.name })
          : t('noBusiness')}
      </p>
      <p className={styles.meta}>
        {t('businessCount', { count: businesses.length })}
      </p>
      <LicenseBanner />
      <SubscriptionPanel />
      <EntitlementsPanel />
      <Link className={styles.link} href={`/${locale}/app/businesses`}>
        {t('manageBusinesses')}
      </Link>
    </section>
  );
}
