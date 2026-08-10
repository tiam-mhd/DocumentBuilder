'use client';

import type { ReactNode } from 'react';
import styles from './editor-banner.module.css';

export type EditorBannerTone = 'info' | 'warning' | 'danger';

type Props = {
  tone?: EditorBannerTone;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
};

/** Shared theme-aware alert strip for editor locks / save / empty guidance. */
export function EditorBanner({
  tone = 'warning',
  title,
  children,
  action,
}: Props) {
  return (
    <div
      className={styles.banner}
      data-tone={tone}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <div className={styles.copy}>
        {title ? <p className={styles.title}>{title}</p> : null}
        <div className={styles.body}>{children}</div>
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
