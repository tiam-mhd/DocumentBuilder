'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { confirmPayment } from '@/shared/api/billing';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import styles from './billing-return.module.css';

export function BillingReturnPage() {
  const t = useTranslations('checkout');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const params = useSearchParams();
  const [message, setMessage] = useState(t('processing'));
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const okParam = params.get('ok');
      const paymentId = params.get('paymentId');
      const authority = params.get('Authority');
      const reason = params.get('reason');

      if (okParam === '1') {
        if (!cancelled) {
          setOk(true);
          setMessage(t('success'));
        }
        return;
      }

      if (okParam === '0') {
        if (!cancelled) {
          setOk(false);
          setMessage(t('failed', { reason: reason ?? 'unknown' }));
        }
        return;
      }

      // Fallback: confirm from client if gateway sent user here directly.
      if (paymentId && authority) {
        try {
          await confirmPayment({
            paymentId,
            gatewayRef: authority,
          });
          if (!cancelled) {
            setOk(true);
            setMessage(t('success'));
          }
        } catch (err) {
          if (!cancelled) {
            setOk(false);
            const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
            setMessage(mapApiErrorCode(code, tErrors));
          }
        }
        return;
      }

      if (!cancelled) {
        setOk(false);
        setMessage(t('missingParams'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, t, tErrors]);

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={ok === false ? styles.error : styles.body}>{message}</p>
      <div className={styles.actions}>
        <Link className={styles.link} href={`/${locale}/app`}>
          {t('backDashboard')}
        </Link>
        <Link className={styles.link} href={`/${locale}/app/billing`}>
          {t('backBilling')}
        </Link>
      </div>
    </section>
  );
}
