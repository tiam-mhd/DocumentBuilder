'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  EntitlementCodes,
  type PublicOrgChartNode,
  type PublicTeamMember,
} from '@vdb/shared-types';
import { getOrgChartTree } from '@/shared/api/org-chart';
import {
  listTeamMembers,
  updateTeamMember,
} from '@/shared/api/team';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import { useEntitlements } from '@/features/billing/use-entitlements';
import { ModuleUpgradeCta } from '@/features/billing/module-upgrade-cta';
import { OrgChartTreeView } from './org-chart-tree';
import styles from './team-page.module.css';

export function OrgChartPage() {
  const t = useTranslations('orgChart');
  const tErrors = useTranslations('errors');
  const { activeBusiness } = useBusinesses();
  const { can, writable, loading: entLoading } = useEntitlements();
  const moduleOk = can(EntitlementCodes.ModuleOrgChart);

  const [roots, setRoots] = useState<PublicOrgChartNode[]>([]);
  const [members, setMembers] = useState<PublicTeamMember[]>([]);
  const [layout, setLayout] = useState<'tree-vertical' | 'tree-horizontal'>(
    'tree-vertical',
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!activeBusiness || !moduleOk) {
      setRoots([]);
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [tree, team] = await Promise.all([
        getOrgChartTree(activeBusiness.id),
        listTeamMembers(activeBusiness.id, { page: 1, pageSize: 100 }),
      ]);
      setRoots(tree.roots);
      setMembers(team.items);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(mapApiErrorCode(err.code, tErrors));
      } else {
        setError(tErrors('UNKNOWN'));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusiness?.id, moduleOk]);

  async function onParentChange(memberId: string, parentMemberId: string) {
    if (!activeBusiness || !writable) return;
    setBusy(true);
    setError(null);
    try {
      await updateTeamMember(activeBusiness.id, memberId, {
        parentMemberId: parentMemberId || null,
      });
      await refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(mapApiErrorCode(err.code, tErrors));
      } else {
        setError(tErrors('UNKNOWN'));
      }
    } finally {
      setBusy(false);
    }
  }

  if (!activeBusiness) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.warn}>{t('needBusiness')}</p>
      </section>
    );
  }

  if (entLoading) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.hint}>{t('loading')}</p>
      </section>
    );
  }

  if (!moduleOk) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.warn}>{t('moduleRequired')}</p>
        <ModuleUpgradeCta moduleCode={EntitlementCodes.ModuleOrgChart} />
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.sub}>{t('subtitle')}</p>
      {!writable ? <p className={styles.warn}>{t('readOnly')}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.create}>
        <label className={styles.field}>
          {t('layout')}
          <select
            className={styles.input}
            value={layout}
            onChange={(e) =>
              setLayout(e.target.value as 'tree-vertical' | 'tree-horizontal')
            }
          >
            <option value="tree-vertical">{t('layoutVertical')}</option>
            <option value="tree-horizontal">{t('layoutHorizontal')}</option>
          </select>
        </label>
      </div>

      {loading ? <p className={styles.hint}>{t('loading')}</p> : null}
      {!loading && roots.length === 0 ? (
        <p className={styles.hint}>{t('empty')}</p>
      ) : (
        <OrgChartTreeView roots={roots} layout={layout} heightPx={420} />
      )}

      <h2 className={styles.h2}>{t('structureTitle')}</h2>
      <ul className={styles.list}>
        {members.map((m) => (
          <li key={m.id} className={styles.card}>
            <div>
              <p className={styles.cardTitle}>{m.name}</p>
              <p className={styles.meta}>{m.roleTitle || t('noRole')}</p>
            </div>
            <label className={styles.field}>
              {t('reportsTo')}
              <select
                className={styles.input}
                value={m.parentMemberId ?? ''}
                disabled={!writable || busy}
                onChange={(e) => void onParentChange(m.id, e.target.value)}
              >
                <option value="">{t('noParent')}</option>
                {members
                  .filter((o) => o.id !== m.id)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
              </select>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
