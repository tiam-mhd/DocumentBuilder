'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PublicAnalyticsSummary } from '@vdb/shared-types';
import { fetchAnalyticsSummary } from '@/shared/api/analytics';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import { useMembershipPermissions } from '@/shared/lib/use-membership-permissions';
import styles from './analytics-page.module.css';

export function AnalyticsPage() {
  const t = useTranslations('analytics');
  const tErrors = useTranslations('errors');
  const { activeBusiness } = useBusinesses();
  const { canReadAudit } = useMembershipPermissions();
  const [data, setData] = useState<PublicAnalyticsSummary | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!activeBusiness || !canReadAudit) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const summary = await fetchAnalyticsSummary(activeBusiness.id, {
        from: from || undefined,
        to: to || undefined,
      });
      setData(summary);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? mapApiErrorCode(err.code, tErrors)
          : tErrors('UNKNOWN'),
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusiness?.id, canReadAudit]);

  function onFilter(event: FormEvent) {
    event.preventDefault();
    void refresh();
  }

  if (!activeBusiness) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.hint}>{t('needBusiness')}</p>
      </section>
    );
  }

  if (!canReadAudit) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.hint}>{t('ownerOnly')}</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.hint}>{t('hint')}</p>
      <p className={styles.privacy}>{t('privacy')}</p>

      <form className={styles.filters} onSubmit={onFilter}>
        <label className={styles.field}>
          {t('from')}
          <input
            className={styles.input}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          {t('to')}
          <input
            className={styles.input}
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button type="submit" className={styles.btn} disabled={loading}>
          {t('apply')}
        </button>
      </form>

      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p className={styles.hint}>{t('loading')}</p> : null}

      {data ? (
        <>
          <div className={styles.totals}>
            <div>
              <p className={styles.statLabel}>{t('views')}</p>
              <p className={styles.statValue}>{data.totals.views}</p>
            </div>
            <div>
              <p className={styles.statLabel}>{t('downloads')}</p>
              <p className={styles.statValue}>{data.totals.downloads}</p>
            </div>
          </div>

          <h2 className={styles.sub}>{t('byDocument')}</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('document')}</th>
                <th>{t('views')}</th>
                <th>{t('downloads')}</th>
              </tr>
            </thead>
            <tbody>
              {data.byDocument.length === 0 ? (
                <tr>
                  <td colSpan={3}>{t('empty')}</td>
                </tr>
              ) : (
                data.byDocument.map((row) => (
                  <tr key={row.documentId}>
                    <td>{row.title}</td>
                    <td>{row.views}</td>
                    <td>{row.downloads}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h2 className={styles.sub}>{t('byDevice')}</h2>
          <ul className={styles.list}>
            {data.byDevice.length === 0 ? (
              <li>{t('empty')}</li>
            ) : (
              data.byDevice.map((row) => (
                <li key={row.device}>
                  {t(`device_${row.device}` as 'device_desktop')} — {row.count}
                </li>
              ))
            )}
          </ul>

          <h2 className={styles.sub}>{t('byCountry')}</h2>
          <ul className={styles.list}>
            {data.byCountry.length === 0 ? (
              <li>{t('emptyCountry')}</li>
            ) : (
              data.byCountry.map((row) => (
                <li key={row.country}>
                  {row.country} — {row.count}
                </li>
              ))
            )}
          </ul>

          <h2 className={styles.sub}>{t('byDay')}</h2>
          <ul className={styles.list}>
            {data.byDay.length === 0 ? (
              <li>{t('empty')}</li>
            ) : (
              data.byDay.map((row) => (
                <li key={row.day}>
                  {row.day}: {t('views')} {row.views}, {t('downloads')}{' '}
                  {row.downloads}
                </li>
              ))
            )}
          </ul>
        </>
      ) : null}
    </section>
  );
}
