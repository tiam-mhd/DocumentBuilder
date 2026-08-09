'use client';

import { useTranslations } from 'next-intl';
import {
  EntitlementCodes,
  MODULE_ENTITLEMENT_CODES,
} from '@vdb/shared-types';
import { useEntitlements } from '@/features/billing/use-entitlements';
import { ModuleUpgradeCta } from '@/features/billing/module-upgrade-cta';
import styles from './entitlements-panel.module.css';

const FEATURE_CODES = [
  EntitlementCodes.ExportPdf,
  ...MODULE_ENTITLEMENT_CODES,
] as const;

export function EntitlementsPanel() {
  const t = useTranslations('entitlements');
  const { entitlements, loading, writable, has } = useEntitlements();

  if (loading) {
    return <p className={styles.hint}>{t('loading')}</p>;
  }

  if (!entitlements) {
    return <p className={styles.hint}>{t('noBusiness')}</p>;
  }

  const anyLocked =
    !writable || FEATURE_CODES.some((code) => !has(code));

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
          const allowed = writable && has(code);
          return (
            <li key={code} className={styles.row}>
              <span className={styles.code}>{code}</span>
              <span
                className={allowed ? styles.action : styles.actionDisabled}
                title={allowed ? t('allowed') : t('locked')}
              >
                {allowed ? t('allowed') : t('locked')}
              </span>
            </li>
          );
        })}
      </ul>
      {anyLocked ? <ModuleUpgradeCta /> : null}
    </section>
  );
}
