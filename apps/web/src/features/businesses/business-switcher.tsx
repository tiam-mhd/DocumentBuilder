'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useBusinesses } from '@/shared/lib/business-context';
import styles from './business-switcher.module.css';

type Props = {
  /** Compact variant for sidebar top */
  variant?: 'sidebar' | 'inline';
};

export function BusinessSwitcher({ variant = 'sidebar' }: Props) {
  const t = useTranslations('businesses');
  const tApp = useTranslations('app');
  const locale = useLocale();
  const { businesses, activeBusiness, selectBusiness, loading } =
    useBusinesses();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (loading) {
    return (
      <div className={`${styles.root} ${styles[variant]}`}>
        <span className={styles.muted}>{t('loading')}</span>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className={`${styles.root} ${styles[variant]}`}>
        <p className={styles.emptyTitle}>{t('none')}</p>
        <Link className={styles.manageLink} href={`/${locale}/app/businesses`}>
          {tApp('businessesLink')}
        </Link>
      </div>
    );
  }

  const initial = (activeBusiness?.name ?? '?').trim().charAt(0).toUpperCase();

  return (
    <div
      className={`${styles.root} ${styles[variant]}`}
      ref={rootRef}
      data-open={open ? 'true' : 'false'}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.avatar} aria-hidden>
          {initial}
        </span>
        <span className={styles.triggerText}>
          <span className={styles.triggerLabel}>{t('switcherLabel')}</span>
          <span className={styles.triggerName}>
            {activeBusiness?.name ?? t('none')}
          </span>
        </span>
        <span className={styles.chevron} aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div className={styles.popover} id={listId} role="listbox">
          <ul className={styles.list}>
            {businesses.map((business) => {
              const active = business.id === activeBusiness?.id;
              return (
                <li key={business.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={styles.option}
                    data-active={active ? 'true' : 'false'}
                    onClick={() => {
                      selectBusiness(business.id);
                      setOpen(false);
                    }}
                  >
                    <span className={styles.optionMark} aria-hidden>
                      {active ? '●' : '○'}
                    </span>
                    <span className={styles.optionName}>{business.name}</span>
                    <span className={styles.optionRole}>{business.role}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Link
            className={styles.manageLink}
            href={`/${locale}/app/businesses`}
            onClick={() => setOpen(false)}
          >
            {t('manageAll')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
