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
        {subscription.daysUntilEnd != null && subscription.daysUntilEnd <= 3 ? (
          <Link className={styles.cta} href={`/${locale}/app/billing`}>
            {t('renewCta')}
          </Link>
        ) : null}
      </aside>
    );
  }

  if (subscription.effectiveStatus === 'grace') {
    const graceEnds = subscription.graceEndsAt
      ? new Date(subscription.graceEndsAt).toLocaleDateString()
      : '';
    return (
      <aside className={`${styles.banner} ${styles.pending}`} role="status">
        <p className={styles.title}>{t('graceBannerTitle')}</p>
        <p className={styles.body}>{t('graceBannerBody', { graceEnds })}</p>
        <Link className={styles.cta} href={`/${locale}/app/billing`}>
          {t('renewCta')}
        </Link>
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
          {t('renewCta')}
        </Link>
      </aside>
    );
  }

  if (
    subscription.effectiveStatus === 'active' &&
    subscription.daysUntilEnd != null &&
    subscription.daysUntilEnd <= 7
  ) {
    return (
      <aside className={`${styles.banner} ${styles.trial}`} role="status">
        <p className={styles.title}>{t('renewSoonTitle')}</p>
        <p className={styles.body}>
          {t('renewSoonBody', { days: subscription.daysUntilEnd })}
        </p>
        <Link className={styles.cta} href={`/${locale}/app/billing`}>
          {t('renewCta')}
        </Link>
      </aside>
    );
  }

  return null;
}
