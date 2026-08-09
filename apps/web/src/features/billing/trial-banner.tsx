'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { PublicSubscription } from '@vdb/shared-types';
import { TRIAL_DURATION_DAYS } from '@vdb/shared-types';
import styles from './trial-banner.module.css';

export function TrialBanner({
  subscription,
}: {
  subscription: PublicSubscription;
}) {
  const t = useTranslations('subscription');
  const locale = useLocale();

  if (subscription.effectiveStatus === 'trial') {
    const ends = subscription.endsAt
      ? new Date(subscription.endsAt).toLocaleDateString()
      : '';
    return (
      <aside className={`${styles.banner} ${styles.trial}`} role="status">
        <p className={styles.title}>{t('trialBannerTitle')}</p>
        <p className={styles.body}>
          {t('trialBannerBody', { days: TRIAL_DURATION_DAYS, ends })}
        </p>
      </aside>
    );
  }

  if (subscription.effectiveStatus === 'pending_payment') {
    return (
      <aside className={`${styles.banner} ${styles.pending}`} role="status">
        <p className={styles.title}>{t('pendingBannerTitle')}</p>
        <p className={styles.body}>{t('pendingBannerBody')}</p>
        <Link className={styles.cta} href={`/${locale}/app/billing`}>
          {t('pendingCta')}
        </Link>
      </aside>
    );
  }

  if (subscription.effectiveStatus === 'expired' || !subscription.writable) {
    return (
      <aside className={`${styles.banner} ${styles.locked}`} role="status">
        <p className={styles.title}>{t('lockedBannerTitle')}</p>
        <p className={styles.body}>{t('lockedBannerBody')}</p>
        <Link className={styles.cta} href={`/${locale}/app/billing`}>
          {t('pendingCta')}
        </Link>
      </aside>
    );
  }

  return null;
}
