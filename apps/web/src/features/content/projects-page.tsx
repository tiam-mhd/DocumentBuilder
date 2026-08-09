'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  EntitlementCodes,
  ProjectStatus,
  type PublicProject,
  type PublicProjectCategory,
} from '@vdb/shared-types';
import {
  createProject,
  createProjectCategory,
  deleteProject,
  deleteProjectCategory,
  listProjectCategories,
  listProjects,
  updateProject,
} from '@/shared/api/projects';
import { listLocations } from '@/shared/api/locations';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import { useEntitlements } from '@/features/billing/use-entitlements';
import { ModuleUpgradeCta } from '@/features/billing/module-upgrade-cta';
import {
  EnTranslationFields,
  buildEnTranslations,
} from './en-translation-fields';
import { ProjectsImportWizard } from './projects-import-wizard';
import styles from './projects-page.module.css';

export function ProjectsPage() {
  const t = useTranslations('projects');
  const tLoc = useTranslations('locations');
  const tErrors = useTranslations('errors');
  const { activeBusiness } = useBusinesses();
  const { writable, loading: entLoading, can } = useEntitlements();
  const moduleOk = can(EntitlementCodes.ModuleProjects);
  const canMutate = writable && moduleOk;

  const [items, setItems] = useState<PublicProject[]>([]);
  const [categories, setCategories] = useState<PublicProjectCategory[]>([]);
  const [locations, setLocations] = useState<
    { id: string; name: string }[]
  >([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [q, setQ] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryEn, setNewCategoryEn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!activeBusiness || !moduleOk) {
      setItems([]);
      setCategories([]);
      setLocations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [list, cats, locs] = await Promise.all([
        listProjects(activeBusiness.id, {
          page: 1,
          pageSize: 50,
          q: q.trim() || undefined,
          status: statusFilter || undefined,
          categoryId: categoryId || undefined,
        }),
        listProjectCategories(activeBusiness.id, { page: 1, pageSize: 100 }),
        listLocations(activeBusiness.id, { page: 1, pageSize: 100 }),
      ]);
      setItems(list.items);
      setCategories(cats.items);
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
  }, [activeBusiness?.id, moduleOk, statusFilter, categoryId]);

  async function onCreateCategory() {
    if (!activeBusiness || !newCategory.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createProjectCategory(activeBusiness.id, {
        name: newCategory.trim(),
        translations: buildEnTranslations({ name: newCategoryEn }),
      });
      setNewCategory('');
      setNewCategoryEn('');
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

  async function onCreate() {
    if (!activeBusiness) return;
    if (!title.trim()) {
      setError(t('titleRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createProject(activeBusiness.id, {
        title: title.trim(),
        description: description.trim(),
        categoryId: categoryId || null,
        locationId: locationId || null,
        status: ProjectStatus.Draft,
        translations: buildEnTranslations({
          title: titleEn,
          description: descriptionEn,
        }),
      });
      setTitle('');
      setDescription('');
      setTitleEn('');
      setDescriptionEn('');
      setLocationId('');
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

  async function onToggleStatus(project: PublicProject) {
    if (!activeBusiness) return;
    setBusy(true);
    setError(null);
    try {
      const next =
        project.status === ProjectStatus.Published
          ? ProjectStatus.Draft
          : ProjectStatus.Published;
      await updateProject(activeBusiness.id, project.id, { status: next });
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

  async function onDelete(project: PublicProject) {
    if (!activeBusiness) return;
    setBusy(true);
    setError(null);
    try {
      await deleteProject(activeBusiness.id, project.id);
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

  async function onDeleteCategory(cat: PublicProjectCategory) {
    if (!activeBusiness) return;
    setBusy(true);
    setError(null);
    try {
      await deleteProjectCategory(activeBusiness.id, cat.id);
      if (categoryId === cat.id) setCategoryId('');
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
        <p className={styles.warn}>{t('moduleLocked')}</p>
        <p className={styles.hint}>{t('moduleHint')}</p>
        <ModuleUpgradeCta moduleCode={EntitlementCodes.ModuleProjects} />
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.sub}>{t('subtitle')}</p>
      {!writable ? <p className={styles.warn}>{t('readOnly')}</p> : null}

      <ProjectsImportWizard
        businessId={activeBusiness.id}
        disabled={!canMutate || busy}
        onCompleted={() => void refresh()}
      />

      <div className={styles.create}>
        <label className={styles.field}>
          {t('categoryName')}
          <input
            className={styles.input}
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            disabled={!canMutate || busy}
          />
        </label>
        <EnTranslationFields
          fieldClassName={styles.field}
          inputClassName={styles.input}
          disabled={!canMutate || busy}
          fields={[
            {
              key: 'name',
              label: t('nameEn'),
              value: newCategoryEn,
              onChange: setNewCategoryEn,
            },
          ]}
        />
        <button
          type="button"
          className={styles.secondary}
          disabled={!canMutate || busy || !newCategory.trim()}
          onClick={() => void onCreateCategory()}
        >
          {t('addCategory')}
        </button>
      </div>

      {categories.length > 0 ? (
        <ul className={styles.catList}>
          {categories.map((c) => (
            <li key={c.id} className={styles.catItem}>
              <span>{c.name}</span>
              <button
                type="button"
                className={styles.danger}
                disabled={!canMutate || busy}
                onClick={() => void onDeleteCategory(c)}
              >
                {t('deleteCategory')}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className={styles.create}>
        <label className={styles.field}>
          {t('projectTitle')}
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canMutate || busy}
          />
        </label>
        <label className={styles.field}>
          {t('description')}
          <input
            className={styles.input}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canMutate || busy}
          />
        </label>
        <EnTranslationFields
          fieldClassName={styles.field}
          inputClassName={styles.input}
          disabled={!canMutate || busy}
          fields={[
            {
              key: 'title',
              label: t('titleEn'),
              value: titleEn,
              onChange: setTitleEn,
            },
            {
              key: 'description',
              label: t('descriptionEn'),
              value: descriptionEn,
              onChange: setDescriptionEn,
            },
          ]}
        />
        <label className={styles.field}>
          {t('category')}
          <select
            className={styles.input}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={busy}
          >
            <option value="">{t('allCategories')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          {tLoc('location')}
          <select
            className={styles.input}
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            disabled={!canMutate || busy}
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
          disabled={!canMutate || busy}
          onClick={() => void onCreate()}
        >
          {busy ? t('saving') : t('create')}
        </button>
      </div>

      <div className={styles.create}>
        <label className={styles.field}>
          {t('search')}
          <input
            className={styles.input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void refresh();
            }}
          />
        </label>
        <label className={styles.field}>
          {t('statusFilter')}
          <select
            className={styles.input}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{t('allStatuses')}</option>
            <option value={ProjectStatus.Draft}>{t('statusDraft')}</option>
            <option value={ProjectStatus.Published}>
              {t('statusPublished')}
            </option>
            <option value={ProjectStatus.Archived}>
              {t('statusArchived')}
            </option>
          </select>
        </label>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => void refresh()}
        >
          {t('applyFilters')}
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p className={styles.hint}>{t('loading')}</p> : null}
      {!loading && items.length === 0 ? (
        <p className={styles.hint}>{t('empty')}</p>
      ) : null}

      <ul className={styles.list}>
        {items.map((p) => (
          <li key={p.id} className={styles.card}>
            <div>
              <p className={styles.cardTitle}>{p.title}</p>
              <p className={styles.meta}>
                {p.categoryName ?? t('uncategorized')} · {p.status}
                {p.locationName
                  ? ` · ${p.locationName}`
                  : p.locationId
                    ? ` · loc:${p.locationId}`
                    : ''}
              </p>
              {p.description ? (
                <p className={styles.hint}>{p.description}</p>
              ) : null}
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondary}
                disabled={!canMutate || busy}
                onClick={() => void onToggleStatus(p)}
              >
                {p.status === ProjectStatus.Published
                  ? t('unpublish')
                  : t('publish')}
              </button>
              <button
                type="button"
                className={styles.danger}
                disabled={!canMutate || busy}
                onClick={() => void onDelete(p)}
              >
                {t('delete')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
