'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { fetchHealth, type HealthReport } from '@/shared/api/system';
import { useEdition } from '@/shared/lib/edition-context';
import { mapApiErrorCode } from '@/shared/api/client';
import styles from './home-page.module.css';

export function HomePage() {
  const t = useTranslations('home');
  const tErrors = useTranslations('errors');
  const { config, loading: editionLoading, error: editionError } = useEdition();
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchHealth();
        if (!cancelled) {
          setHealth(data);
          setHealthError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const code =
            err && typeof err === 'object' && 'code' in err
              ? String((err as { code: string }).code)
              : 'UNKNOWN';
          setHealthError(mapApiErrorCode(code, tErrors));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tErrors]);

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.description}>{t('description')}</p>

      <dl className={styles.meta}>
        <div>
          <dt>{t('edition')}</dt>
          <dd>
            {editionLoading
              ? t('loading')
              : editionError
                ? mapApiErrorCode(editionError, tErrors)
                : (config?.edition ?? '—')}
          </dd>
        </div>
        <div>
          <dt>{t('publicSignup')}</dt>
          <dd>
            {editionLoading
              ? t('loading')
              : editionError
                ? mapApiErrorCode(editionError, tErrors)
                : config?.publicSignup
                  ? t('publicSignupOn')
                  : t('publicSignupOff')}
          </dd>
        </div>
        <div>
          <dt>{t('apiHealth')}</dt>
          <dd>
            {healthError
              ? healthError
              : health
                ? `${health.status} · pg:${health.checks.postgres} redis:${health.checks.redis} mongo:${health.checks.mongo}`
                : t('loading')}
          </dd>
        </div>
      </dl>
    </section>
  );
}
