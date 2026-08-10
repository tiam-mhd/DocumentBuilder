'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PublicPluginManifest } from '@vdb/shared-types';
import { listPlugins } from '@/shared/api/plugins';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import styles from './plugins-page.module.css';

export function PluginsPage() {
  const t = useTranslations('plugins');
  const tErrors = useTranslations('errors');
  const tBlocks = useTranslations('blocks');
  const [items, setItems] = useState<PublicPluginManifest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listPlugins();
        if (!cancelled) setItems(data.items);
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiClientError) {
            setError(mapApiErrorCode(e.code, tErrors));
          } else {
            setError(t('loadFailed'));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, tErrors]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.hint}>{t('hint')}</p>
        <p className={styles.security}>{t('security')}</p>
      </header>

      {loading ? <p className={styles.meta}>{t('loading')}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {!loading && !error && items.length === 0 ? (
        <p className={styles.meta}>{t('empty')}</p>
      ) : null}

      <ul className={styles.list}>
        {items.map((p) => (
          <li key={p.id} className={styles.item}>
            <div className={styles.itemHead}>
              <h2 className={styles.itemTitle}>{p.name}</h2>
              <span className={styles.badge}>{p.trust}</span>
            </div>
            <p className={styles.meta}>
              {p.id} · v{p.version}
              {p.moduleCode ? ` · ${p.moduleCode}` : ''}
            </p>
            {p.description ? (
              <p className={styles.desc}>{p.description}</p>
            ) : null}
            <ul className={styles.blocks}>
              {p.blocks.map((b) => (
                <li key={b.type}>
                  <code>{b.type}</code>
                  {' — '}
                  {tBlocks(b.labelKey as 'notice')}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </main>
  );
}
