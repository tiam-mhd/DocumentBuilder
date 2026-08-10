'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import type { PublicMarketplaceTemplate } from '@vdb/shared-types';
import { EntitlementCodes } from '@vdb/shared-types';
import {
  installMarketplaceTemplate,
  listMarketplaceTemplates,
} from '@/shared/api/marketplace';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import { useEdition } from '@/shared/lib/edition-context';
import { useEntitlements } from '@/features/billing/use-entitlements';
import { useMembershipPermissions } from '@/shared/lib/use-membership-permissions';
import { ModuleUpgradeCta } from '@/features/billing/module-upgrade-cta';
import styles from './marketplace-page.module.css';

export function MarketplacePage() {
  const t = useTranslations('marketplace');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const { activeBusiness } = useBusinesses();
  const { config } = useEdition();
  const { has, loading: entLoading } = useEntitlements();
  const { canManageTemplates } = useMembershipPermissions();
  const [items, setItems] = useState<PublicMarketplaceTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [installedId, setInstalledId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const enabled = Boolean(config?.templateMarketplace);
  const entitled =
    !entLoading && has(EntitlementCodes.MarketplaceTemplates);

  useEffect(() => {
    if (!activeBusiness || !enabled || !entitled) {
      setItems([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listMarketplaceTemplates(activeBusiness.id, {
          pageSize: 50,
        });
        if (!cancelled) setItems(data.items);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? mapApiErrorCode(err.code, tErrors)
              : tErrors('UNKNOWN'),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBusiness, enabled, entitled, tErrors]);

  async function onInstall(id: string) {
    if (!activeBusiness || !canManageTemplates) return;
    setBusyId(id);
    setError(null);
    setInstalledId(null);
    try {
      const data = await installMarketplaceTemplate(activeBusiness.id, id);
      setInstalledId(data.template.id);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? mapApiErrorCode(err.code, tErrors)
          : tErrors('UNKNOWN'),
      );
    } finally {
      setBusyId(null);
    }
  }

  if (!activeBusiness) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.hint}>{t('needBusiness')}</p>
      </section>
    );
  }

  if (!enabled) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.hint}>{t('saasOnly')}</p>
      </section>
    );
  }

  if (!entitled) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.hint}>{t('needEntitlement')}</p>
        <ModuleUpgradeCta
          moduleCode={EntitlementCodes.MarketplaceTemplates}
        />
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.hint}>{t('hint')}</p>
      <p className={styles.meta}>{t('paymentsNonGoal')}</p>
      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p className={styles.hint}>{t('loading')}</p> : null}
      {installedId ? (
        <p className={styles.success}>
          {t('installed')}{' '}
          <Link href={`/${locale}/app/templates`}>{t('openTemplates')}</Link>
        </p>
      ) : null}

      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.card}>
            <div>
              <h2 className={styles.name}>{item.name}</h2>
              <p className={styles.meta}>
                {item.slug} · {item.locale}
              </p>
              {item.description ? (
                <p className={styles.desc}>{item.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              className={styles.btn}
              disabled={
                !canManageTemplates || busyId === item.id || Boolean(busyId)
              }
              onClick={() => void onInstall(item.id)}
            >
              {busyId === item.id ? t('installing') : t('install')}
            </button>
          </li>
        ))}
      </ul>
      {!loading && items.length === 0 ? (
        <p className={styles.hint}>{t('empty')}</p>
      ) : null}
    </section>
  );
}
