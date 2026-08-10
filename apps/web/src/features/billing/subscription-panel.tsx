'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PublicSubscription } from '@vdb/shared-types';
import { fetchBusinessSubscription } from '@/shared/api/subscriptions';
import { useBusinesses } from '@/shared/lib/business-context';
import { SubscriptionBadge } from '@/features/billing/subscription-badge';
import { TrialBanner } from '@/features/billing/trial-banner';
import styles from './subscription-panel.module.css';

export function SubscriptionPanel() {
  const t = useTranslations('subscription');
  const { activeBusiness, loading: businessLoading } = useBusinesses();
  const [subscription, setSubscription] = useState<PublicSubscription | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeBusiness) {
      setSubscription(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await fetchBusinessSubscription(activeBusiness.id);
        if (!cancelled) setSubscription(data);
      } catch {
        if (!cancelled) setSubscription(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBusiness]);

  if (businessLoading || loading) {
    return <p className={styles.hint}>{t('loading')}</p>;
  }

  if (!activeBusiness) {
    return <p className={styles.hint}>{t('noBusiness')}</p>;
  }

  return (
    <div className={styles.panel}>
      {subscription ? <TrialBanner subscription={subscription} /> : null}
      <div className={styles.row}>
        <span className={styles.label}>{t('label')}</span>
        <SubscriptionBadge subscription={subscription} />
      </div>
      {subscription ? (
        <dl className={styles.meta}>
          <div>
            <dt>{t('storedStatus')}</dt>
            <dd>{t(`status.${subscription.status}`)}</dd>
          </div>
          <div>
            <dt>{t('startsAt')}</dt>
            <dd>{new Date(subscription.startsAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt>{t('endsAt')}</dt>
            <dd>
              {subscription.endsAt
                ? new Date(subscription.endsAt).toLocaleString()
                : t('noEnd')}
            </dd>
          </div>
          {subscription.graceEndsAt ? (
            <div>
              <dt>{t('graceEndsAt')}</dt>
              <dd>{new Date(subscription.graceEndsAt).toLocaleString()}</dd>
            </div>
          ) : null}
          {subscription.daysUntilEnd != null ? (
            <div>
              <dt>{t('daysUntilEnd')}</dt>
              <dd>{subscription.daysUntilEnd}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className={styles.hint}>{t('missing')}</p>
      )}
    </div>
  );
}
