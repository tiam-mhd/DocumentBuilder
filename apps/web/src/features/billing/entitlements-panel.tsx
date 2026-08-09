'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { EntitlementCodes } from '@vdb/shared-types';
import { useEntitlements } from '@/features/billing/use-entitlements';
import styles from './entitlements-panel.module.css';

const FEATURE_CODES = [
  EntitlementCodes.ExportPdf,
  EntitlementCodes.ModuleMap,
  EntitlementCodes.ModuleOrgChart,
  EntitlementCodes.ModuleTimeline,
  EntitlementCodes.ModuleProjects,
] as const;

export function EntitlementsPanel() {
  const t = useTranslations('entitlements');
  const locale = useLocale();
  const { entitlements, loading, writable, can } = useEntitlements();

  if (loading) {
    return <p className={styles.hint}>{t('loading')}</p>;
  }

  if (!entitlements) {
    return <p className={styles.hint}>{t('noBusiness')}</p>;
  }

  return (
    <section className={styles.panel} aria-label={t('title')}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('title')}</h2>
        <span className={writable ? styles.badgeOk : styles.badgeLocked}>
          {writable ? t('writable') : t('readOnly')}
        </span>
      </div>
      <p className={styles.hint}>
        {t('plan', { plan: entitlements.planCode ?? t('noPlan') })}
      </p>
      <ul className={styles.list}>
        {FEATURE_CODES.map((code) => {
          const allowed = can(code);
          return (
            <li key={code} className={styles.row}>
              <span className={styles.code}>{code}</span>
              <button
                type="button"
                className={allowed ? styles.action : styles.actionDisabled}
                disabled={!allowed}
                title={allowed ? t('allowed') : t('locked')}
              >
                {allowed ? t('allowed') : t('locked')}
              </button>
            </li>
          );
        })}
      </ul>
      {!writable ? (
        <Link className={styles.link} href={`/${locale}/app/billing`}>
          {t('unlockCta')}
        </Link>
      ) : null}
    </section>
  );
}
