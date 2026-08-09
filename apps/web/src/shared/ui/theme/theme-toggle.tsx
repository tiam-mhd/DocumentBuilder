'use client';

import { useTranslations } from 'next-intl';
import { useTheme } from './theme-provider';
import type { ThemePreference } from './theme-types';
import styles from './theme-toggle.module.css';

export function ThemeToggle() {
  const t = useTranslations('theme');
  const { preference, setPreference } = useTheme();

  return (
    <label className={styles.root}>
      <span className={styles.label}>{t('label')}</span>
      <select
        className={styles.select}
        value={preference}
        onChange={(event) =>
          setPreference(event.target.value as ThemePreference)
        }
        aria-label={t('label')}
      >
        <option value="light">{t('light')}</option>
        <option value="dark">{t('dark')}</option>
        <option value="system">{t('system')}</option>
      </select>
    </label>
  );
}
