'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import styles from './module-upgrade-cta.module.css';

type Props = {
  /** Optional module code shown in hint copy. */
  moduleCode?: string;
  className?: string;
};

/** Shared CTA → billing catalog for locked modules / read-only subscription. */
export function ModuleUpgradeCta({ moduleCode, className }: Props) {
  const t = useTranslations('entitlements');
  const locale = useLocale();

  return (
    <p className={className ?? styles.wrap}>
      {moduleCode ? (
        <span className={styles.hint}>
          {t('moduleLockedHint', { code: moduleCode })}
        </span>
      ) : null}
      <Link className={styles.link} href={`/${locale}/app/billing`}>
        {t('upgradeModuleCta')}
      </Link>
    </p>
  );
}
