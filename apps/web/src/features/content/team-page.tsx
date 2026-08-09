'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PublicBranch, PublicTeamMember } from '@vdb/shared-types';
import {
  createBranch,
  createTeamMember,
  deleteBranch,
  deleteTeamMember,
  listBranches,
  listTeamMembers,
} from '@/shared/api/team';
import { listLocations } from '@/shared/api/locations';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import { useEntitlements } from '@/features/billing/use-entitlements';
import {
  EnTranslationFields,
  buildEnTranslations,
} from './en-translation-fields';
import styles from './team-page.module.css';

export function TeamPage() {
  const t = useTranslations('team');
  const tLoc = useTranslations('locations');
  const tErrors = useTranslations('errors');
  const { activeBusiness } = useBusinesses();
  const { writable, loading: entLoading } = useEntitlements();

  const [members, setMembers] = useState<PublicTeamMember[]>([]);
  const [branches, setBranches] = useState<PublicBranch[]>([]);
  const [locations, setLocations] = useState<
    { id: string; name: string }[]
  >([]);
  const [memberName, setMemberName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [memberNameEn, setMemberNameEn] = useState('');
  const [roleTitleEn, setRoleTitleEn] = useState('');
  const [departmentEn, setDepartmentEn] = useState('');
  const [memberBranchId, setMemberBranchId] = useState('');
  const [memberParentId, setMemberParentId] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchNameEn, setBranchNameEn] = useState('');
  const [city, setCity] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [branchLocationId, setBranchLocationId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!activeBusiness) {
      setMembers([]);
      setBranches([]);
      setLocations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [m, b, locs] = await Promise.all([
        listTeamMembers(activeBusiness.id, { page: 1, pageSize: 100 }),
        listBranches(activeBusiness.id, { page: 1, pageSize: 100 }),
        listLocations(activeBusiness.id, { page: 1, pageSize: 100 }),
      ]);
      setMembers(m.items);
      setBranches(b.items);
      setLocations(locs.items.map((l) => ({ id: l.id, name: l.name })));
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
  }, [activeBusiness?.id]);

  async function onCreateBranch() {
    if (!activeBusiness || !branchName.trim()) {
      setError(t('branchNameRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createBranch(activeBusiness.id, {
        name: branchName.trim(),
        city: city.trim(),
        addressLine1: addressLine1.trim(),
        locationId: branchLocationId || null,
        translations: buildEnTranslations({ name: branchNameEn }),
      });
      setBranchName('');
      setBranchNameEn('');
      setCity('');
      setAddressLine1('');
      setBranchLocationId('');
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

  async function onCreateMember() {
    if (!activeBusiness || !memberName.trim()) {
      setError(t('memberNameRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createTeamMember(activeBusiness.id, {
        name: memberName.trim(),
        roleTitle: roleTitle.trim(),
        department: department.trim(),
        branchId: memberBranchId || null,
        parentMemberId: memberParentId || null,
        translations: buildEnTranslations({
          name: memberNameEn,
          roleTitle: roleTitleEn,
          department: departmentEn,
        }),
      });
      setMemberName('');
      setRoleTitle('');
      setDepartment('');
      setMemberNameEn('');
      setRoleTitleEn('');
      setDepartmentEn('');
      setMemberParentId('');
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

  async function onDeleteMember(id: string) {
    if (!activeBusiness) return;
    setBusy(true);
    setError(null);
    try {
      await deleteTeamMember(activeBusiness.id, id);
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

  async function onDeleteBranch(id: string) {
    if (!activeBusiness) return;
    setBusy(true);
    setError(null);
    try {
      await deleteBranch(activeBusiness.id, id);
      if (memberBranchId === id) setMemberBranchId('');
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

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.sub}>{t('subtitle')}</p>
      {!writable ? <p className={styles.warn}>{t('readOnly')}</p> : null}

      <h2 className={styles.h2}>{t('branchesTitle')}</h2>
      <div className={styles.create}>
        <label className={styles.field}>
          {t('branchName')}
          <input
            className={styles.input}
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <EnTranslationFields
          fieldClassName={styles.field}
          inputClassName={styles.input}
          disabled={!writable || busy}
          fields={[
            {
              key: 'name',
              label: t('nameEn'),
              value: branchNameEn,
              onChange: setBranchNameEn,
            },
          ]}
        />
        <label className={styles.field}>
          {t('city')}
          <input
            className={styles.input}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <label className={styles.field}>
          {t('address')}
          <input
            className={styles.input}
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <label className={styles.field}>
          {tLoc('location')}
          <select
            className={styles.input}
            value={branchLocationId}
            onChange={(e) => setBranchLocationId(e.target.value)}
            disabled={!writable || busy}
          >
            <option value="">{tLoc('pickNone')}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={styles.primary}
          disabled={!writable || busy}
          onClick={() => void onCreateBranch()}
        >
          {t('addBranch')}
        </button>
      </div>
      <ul className={styles.list}>
        {branches.map((b) => (
          <li key={b.id} className={styles.card}>
            <div>
              <p className={styles.cardTitle}>{b.name}</p>
              <p className={styles.meta}>
                {[b.city, b.addressLine1].filter(Boolean).join(' · ') ||
                  t('noAddress')}
                {b.locationName
                  ? ` · ${b.locationName}`
                  : b.locationId
                    ? ` · loc:${b.locationId}`
                    : ''}
              </p>
            </div>
            <button
              type="button"
              className={styles.danger}
              disabled={!writable || busy}
              onClick={() => void onDeleteBranch(b.id)}
            >
              {t('delete')}
            </button>
          </li>
        ))}
      </ul>

      <h2 className={styles.h2}>{t('membersTitle')}</h2>
      <div className={styles.create}>
        <label className={styles.field}>
          {t('memberName')}
          <input
            className={styles.input}
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <label className={styles.field}>
          {t('roleTitle')}
          <input
            className={styles.input}
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <label className={styles.field}>
          {t('department')}
          <input
            className={styles.input}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <EnTranslationFields
          fieldClassName={styles.field}
          inputClassName={styles.input}
          disabled={!writable || busy}
          fields={[
            {
              key: 'name',
              label: t('nameEn'),
              value: memberNameEn,
              onChange: setMemberNameEn,
            },
            {
              key: 'roleTitle',
              label: t('roleTitleEn'),
              value: roleTitleEn,
              onChange: setRoleTitleEn,
            },
            {
              key: 'department',
              label: t('departmentEn'),
              value: departmentEn,
              onChange: setDepartmentEn,
            },
          ]}
        />
        <label className={styles.field}>
          {t('branch')}
          <select
            className={styles.input}
            value={memberBranchId}
            onChange={(e) => setMemberBranchId(e.target.value)}
            disabled={!writable || busy}
          >
            <option value="">{t('noBranch')}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          {t('reportsTo')}
          <select
            className={styles.input}
            value={memberParentId}
            onChange={(e) => setMemberParentId(e.target.value)}
            disabled={!writable || busy}
          >
            <option value="">{t('noParent')}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={styles.primary}
          disabled={!writable || busy}
          onClick={() => void onCreateMember()}
        >
          {t('addMember')}
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p className={styles.hint}>{t('loading')}</p> : null}

      <ul className={styles.list}>
        {members.map((m) => (
          <li key={m.id} className={styles.card}>
            <div>
              <p className={styles.cardTitle}>{m.name}</p>
              <p className={styles.meta}>
                {[m.roleTitle, m.department, m.branchName]
                  .filter(Boolean)
                  .join(' · ') || t('noRole')}
                {m.parentMemberId
                  ? ` · ${t('reportsToShort')}: ${
                      members.find((x) => x.id === m.parentMemberId)?.name ??
                      m.parentMemberId
                    }`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              className={styles.danger}
              disabled={!writable || busy}
              onClick={() => void onDeleteMember(m.id)}
            >
              {t('delete')}
            </button>
          </li>
        ))}
      </ul>
      {!loading && members.length === 0 ? (
        <p className={styles.hint}>{t('emptyMembers')}</p>
      ) : null}
    </section>
  );
}
