'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { BillingCatalog } from '@vdb/shared-types';
import { fetchBillingCatalog } from '@/shared/api/catalog';
import { startCheckout } from '@/shared/api/billing';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import { fetchSystemConfig } from '@/shared/api/system';
import styles from './catalog-page.module.css';

function formatPrice(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
      style: 'currency',
      currency: currency === 'IRR' ? 'IRR' : currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function CatalogPage({ locale }: { locale: string }) {
  const t = useTranslations('catalog');
  const tErrors = useTranslations('errors');
  const { activeBusiness } = useBusinesses();
  const [catalog, setCatalog] = useState<BillingCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [platformCheckout, setPlatformCheckout] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [data, config] = await Promise.all([
          fetchBillingCatalog(),
          fetchSystemConfig().catch(() => null),
        ]);
        if (!cancelled) {
          setCatalog(data);
          setSelectedPlan(data.plans[0]?.code ?? null);
          if (config) setPlatformCheckout(config.platformCheckout);
        }
      } catch (err) {
        if (!cancelled) {
          const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
          setError(mapApiErrorCode(code, tErrors));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tErrors]);

  function toggleModule(code: string) {
    setSelectedModules((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  async function onCheckout() {
    if (!activeBusiness || !selectedPlan) {
      setError(t('needBusiness'));
      return;
    }
    setCheckoutBusy(true);
    setError(null);
    try {
      const key =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `checkout_${Date.now()}`;
      const session = await startCheckout(
        activeBusiness.id,
        { planCode: selectedPlan, moduleCodes: selectedModules },
        key,
      );
      window.location.assign(session.redirectUrl);
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
      setCheckoutBusy(false);
    }
  }

  if (loading) {
    return <p className={styles.hint}>{t('loading')}</p>;
  }

  if (error && !catalog) {
    return <p className={styles.error}>{error}</p>;
  }

  if (!catalog) {
    return <p className={styles.hint}>{t('empty')}</p>;
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.hint}>{t('hint')}</p>
      {!platformCheckout ? (
        <p className={styles.hint}>{t('selfHostedHint')}</p>
      ) : null}
      {!activeBusiness ? (
        <p className={styles.hint}>{t('needBusiness')}</p>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <h2 className={styles.subtitle}>{t('plansTitle')}</h2>
      <ul className={styles.grid}>
        {catalog.plans.map((plan) => {
          const active = selectedPlan === plan.code;
          return (
            <li key={plan.id}>
              <button
                type="button"
                className={active ? styles.cardActive : styles.card}
                onClick={() => setSelectedPlan(plan.code)}
              >
                <p className={styles.cardTitle}>{t(plan.nameKey)}</p>
                <p className={styles.cardBody}>{t(plan.descriptionKey)}</p>
                <p className={styles.price}>
                  {formatPrice(plan.priceMonthly, plan.currency, locale)}
                  <span> / {t('perMonth')}</span>
                </p>
                <p className={styles.meta}>
                  {t('includes')}: {plan.baseEntitlements.join(', ')}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      <h2 className={styles.subtitle}>{t('modulesTitle')}</h2>
      <ul className={styles.grid}>
        {catalog.modules.map((mod) => {
          const active = selectedModules.includes(mod.code);
          return (
            <li key={mod.id}>
              <button
                type="button"
                className={active ? styles.cardActive : styles.card}
                onClick={() => toggleModule(mod.code)}
              >
                <p className={styles.cardTitle}>{t(mod.nameKey)}</p>
                <p className={styles.cardBody}>{t(mod.descriptionKey)}</p>
                <p className={styles.price}>
                  {formatPrice(mod.priceMonthly, mod.currency, locale)}
                  <span> / {t('perMonth')}</span>
                </p>
                <p className={styles.meta}>{mod.code}</p>
              </button>
            </li>
          );
        })}
      </ul>

      <div className={styles.footer}>
        <p className={styles.hint}>
          {t('selectionSummary', {
            plan: selectedPlan ?? '—',
            modules: selectedModules.length,
          })}
        </p>
        <button
          type="button"
          className={styles.cta}
          disabled={
            !platformCheckout ||
            !activeBusiness ||
            !selectedPlan ||
            checkoutBusy
          }
          onClick={() => void onCheckout()}
        >
          {checkoutBusy ? t('checkoutBusy') : t('checkout')}
        </button>
      </div>
    </section>
  );
}
