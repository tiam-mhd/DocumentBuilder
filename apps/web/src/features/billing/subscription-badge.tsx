'use client';

import { useTranslations } from 'next-intl';
import type { PublicSubscription, SubscriptionStatus } from '@vdb/shared-types';
import styles from './subscription-badge.module.css';

const STATUS_CLASS: Record<SubscriptionStatus, string> = {
  trial: styles.trial,
  active: styles.active,
  grace: styles.grace,
  expired: styles.expired,
  pending_payment: styles.pending,
};

export function SubscriptionBadge({
  subscription,
}: {
  subscription: PublicSubscription | null;
}) {
  const t = useTranslations('subscription');

  if (!subscription) {
    return <span className={styles.badge}>{t('unknown')}</span>;
  }

  const status = subscription.effectiveStatus;
  return (
    <span className={`${styles.badge} ${STATUS_CLASS[status]}`}>
      {t(`status.${status}`)}
      {!subscription.writable ? ` · ${t('locked')}` : ''}
    </span>
  );
}
