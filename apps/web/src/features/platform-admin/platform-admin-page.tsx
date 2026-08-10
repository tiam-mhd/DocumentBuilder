'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { notFound } from 'next/navigation';
import type {
  PublicPlatformAdminBusiness,
  PublicPlatformAdminFailedJob,
  PublicPlatformAdminSubscription,
  PublicPlatformAdminUser,
} from '@vdb/shared-types';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import {
  fetchPlatformAdminMe,
  listPlatformAdminBusinesses,
  listPlatformAdminFailedJobs,
  listPlatformAdminSubscriptions,
  listPlatformAdminUsers,
  suspendPlatformBusiness,
  unsuspendPlatformBusiness,
} from '@/shared/api/platform-admin';
import { useEdition } from '@/shared/lib/edition-context';
import styles from './platform-admin-page.module.css';

type Tab = 'users' | 'businesses' | 'subscriptions' | 'jobs';

export function PlatformAdminPage() {
  const t = useTranslations('platformAdmin');
  const tErrors = useTranslations('errors');
  const { config, loading: editionLoading } = useEdition();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('businesses');
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<PublicPlatformAdminUser[]>([]);
  const [businesses, setBusinesses] = useState<PublicPlatformAdminBusiness[]>(
    [],
  );
  const [subs, setSubs] = useState<PublicPlatformAdminSubscription[]>([]);
  const [jobs, setJobs] = useState<PublicPlatformAdminFailedJob[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const enabled = Boolean(config?.platformAdminConsole);

  useEffect(() => {
    if (editionLoading) return;
    if (!enabled) {
      setAllowed(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchPlatformAdminMe();
        if (!cancelled) setAllowed(me.isPlatformAdmin);
      } catch {
        if (!cancelled) setAllowed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editionLoading, enabled]);

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setError(null);
    try {
      if (tab === 'users') {
        const data = await listPlatformAdminUsers({ pageSize: 50 });
        setUsers(data.items);
      } else if (tab === 'businesses') {
        const data = await listPlatformAdminBusinesses({ pageSize: 50 });
        setBusinesses(data.items);
      } else if (tab === 'subscriptions') {
        const data = await listPlatformAdminSubscriptions({ pageSize: 50 });
        setSubs(data.items);
      } else {
        const data = await listPlatformAdminFailedJobs({ pageSize: 50 });
        setJobs(data.items);
      }
    } catch (e) {
      if (e instanceof ApiClientError) {
        setError(mapApiErrorCode(e.code, tErrors));
      } else {
        setError(t('loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [allowed, tab, t, tErrors]);

  useEffect(() => {
    void load();
  }, [load]);

  if (editionLoading || allowed === null) {
    return <p className={styles.meta}>{t('loading')}</p>;
  }

  if (!enabled || !allowed) {
    notFound();
  }

  async function onSuspend(id: string) {
    const reason = window.prompt(t('suspendReasonPrompt')) ?? undefined;
    setBusyId(id);
    setError(null);
    try {
      await suspendPlatformBusiness(id, reason || undefined);
      await load();
    } catch (e) {
      if (e instanceof ApiClientError) {
        setError(mapApiErrorCode(e.code, tErrors));
      } else {
        setError(t('actionFailed'));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function onUnsuspend(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await unsuspendPlatformBusiness(id);
      await load();
    } catch (e) {
      if (e instanceof ApiClientError) {
        setError(mapApiErrorCode(e.code, tErrors));
      } else {
        setError(t('actionFailed'));
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.hint}>{t('hint')}</p>
        <p className={styles.security}>{t('security')}</p>
      </header>

      <nav className={styles.tabs} aria-label={t('tabsLabel')}>
        {(
          [
            ['businesses', t('tabBusinesses')],
            ['users', t('tabUsers')],
            ['subscriptions', t('tabSubscriptions')],
            ['jobs', t('tabJobs')],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? styles.tabActive : styles.tab}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {loading ? <p className={styles.meta}>{t('loading')}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {tab === 'users' && !loading ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('colMobile')}</th>
                <th>{t('colMemberships')}</th>
                <th>{t('colCreated')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.mobile}</td>
                  <td>{u.membershipCount}</td>
                  <td>{u.createdAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 ? <p className={styles.meta}>{t('empty')}</p> : null}
        </div>
      ) : null}

      {tab === 'businesses' && !loading ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('colName')}</th>
                <th>{t('colStatus')}</th>
                <th>{t('colMembers')}</th>
                <th>{t('colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div>{b.name}</div>
                    <div className={styles.id}>{b.id}</div>
                  </td>
                  <td>
                    {b.suspended ? t('statusSuspended') : t('statusActive')}
                    {b.suspendedReason ? (
                      <div className={styles.id}>{b.suspendedReason}</div>
                    ) : null}
                  </td>
                  <td>{b.memberCount}</td>
                  <td>
                    {b.suspended ? (
                      <button
                        type="button"
                        className={styles.btn}
                        disabled={busyId === b.id}
                        onClick={() => void onUnsuspend(b.id)}
                      >
                        {t('unsuspend')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.btnDanger}
                        disabled={busyId === b.id}
                        onClick={() => void onSuspend(b.id)}
                      >
                        {t('suspend')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {businesses.length === 0 ? (
            <p className={styles.meta}>{t('empty')}</p>
          ) : null}
        </div>
      ) : null}

      {tab === 'subscriptions' && !loading ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('colBusiness')}</th>
                <th>{t('colPlan')}</th>
                <th>{t('colSubStatus')}</th>
                <th>{t('colEnds')}</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.businessName}
                    {s.businessSuspended ? ` (${t('statusSuspended')})` : ''}
                  </td>
                  <td>{s.planCode ?? '—'}</td>
                  <td>{s.effectiveStatus}</td>
                  <td>{s.endsAt ? s.endsAt.slice(0, 10) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {subs.length === 0 ? <p className={styles.meta}>{t('empty')}</p> : null}
        </div>
      ) : null}

      {tab === 'jobs' && !loading ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('colJob')}</th>
                <th>{t('colBusinessId')}</th>
                <th>{t('colError')}</th>
                <th>{t('colCreated')}</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>
                    <div>{j.kind}</div>
                    <div className={styles.id}>{j.id}</div>
                  </td>
                  <td className={styles.id}>{j.businessId}</td>
                  <td>
                    {j.errorCode ?? '—'}
                    {j.errorMessage ? (
                      <div className={styles.id}>{j.errorMessage}</div>
                    ) : null}
                  </td>
                  <td>{j.createdAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {jobs.length === 0 ? <p className={styles.meta}>{t('empty')}</p> : null}
        </div>
      ) : null}
    </main>
  );
}
