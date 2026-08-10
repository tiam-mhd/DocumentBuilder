'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from './theme-provider';
import type { ThemePreference } from './theme-types';
import styles from '../header-icon-controls.module.css';

export function ThemeIconControl() {
  const t = useTranslations('theme');
  const { preference, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={styles.wrap} ref={rootRef}>
      <button
        type="button"
        className={styles.iconBtn}
        aria-label={t('label')}
        aria-expanded={open}
        aria-controls={menuId}
        title={t('label')}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path
            fill="currentColor"
            d="M12 3a1 1 0 0 1 1 1v1.06a7.5 7.5 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 4.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z"
          />
        </svg>
      </button>
      {open ? (
        <div className={styles.menu} id={menuId} role="menu">
          {(['light', 'dark', 'system'] as ThemePreference[]).map((value) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={preference === value}
              className={styles.menuItem}
              data-active={preference === value ? 'true' : 'false'}
              onClick={() => {
                setPreference(value);
                setOpen(false);
              }}
            >
              {t(value)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
