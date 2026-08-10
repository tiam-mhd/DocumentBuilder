'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { locales, type AppLocale } from '@/shared/i18n/routing';
import styles from './header-icon-controls.module.css';

export function LocaleIconControl() {
  const t = useTranslations('locale');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
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

  function onChange(next: AppLocale) {
    const segments = pathname.split('/');
    segments[1] = next;
    router.replace(segments.join('/') || `/${next}`);
    setOpen(false);
  }

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
            d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm7.4 9h-3.1a15 15 0 0 0-1.2-5.1A8.02 8.02 0 0 1 19.4 11ZM12 4c.9 0 2.3 2.2 3 6H9c.7-3.8 2.1-6 3-6ZM4.6 13h3.1c.3 1.9.8 3.6 1.2 5.1A8.02 8.02 0 0 1 4.6 13Zm3.1-2H4.6A8.02 8.02 0 0 1 8.9 5.9 15 15 0 0 0 7.7 11Zm1.3 2h6c-.7 3.8-2.1 6-3 6s-2.3-2.2-3-6Zm6.9 5.1c.4-1.5.9-3.2 1.2-5.1h3.1a8.02 8.02 0 0 1-4.3 5.1Z"
          />
        </svg>
      </button>
      {open ? (
        <div className={styles.menu} id={menuId} role="menu">
          {locales.map((code) => (
            <button
              key={code}
              type="button"
              role="menuitemradio"
              aria-checked={locale === code}
              className={styles.menuItem}
              data-active={locale === code ? 'true' : 'false'}
              onClick={() => onChange(code)}
            >
              {t(code)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
