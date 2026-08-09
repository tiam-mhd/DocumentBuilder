'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type {
  PublicBlockRegistryEntry,
  PublicDocumentTemplate,
  PublicDocumentTemplateDetail,
} from '@vdb/shared-types';
import {
  createTemplate,
  deleteTemplate,
  fetchBlockRegistry,
  getTemplate,
  listTemplates,
} from '@/shared/api/templates';
import { listThemes } from '@/shared/api/themes';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import { useEntitlements } from '@/features/billing/use-entitlements';
import styles from './templates-page.module.css';

function countBlocks(body: unknown): number {
  if (!body || typeof body !== 'object') return 0;
  const blocks = (body as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocks)) return 0;
  let n = 0;
  const walk = (nodes: unknown[]) => {
    for (const node of nodes) {
      n += 1;
      if (node && typeof node === 'object') {
        const children = (node as { children?: unknown }).children;
        if (Array.isArray(children)) walk(children);
      }
    }
  };
  walk(blocks);
  return n;
}

export function TemplatesPage() {
  const t = useTranslations('templates');
  const tBlocks = useTranslations('blocks');
  const tErrors = useTranslations('errors');
  const { activeBusiness } = useBusinesses();
  const { writable, loading: entLoading } = useEntitlements();
  const [items, setItems] = useState<PublicDocumentTemplate[]>([]);
  const [registry, setRegistry] = useState<PublicBlockRegistryEntry[]>([]);
  const [themes, setThemes] = useState<{ id: string; name: string }[]>([]);
  const [name, setName] = useState('');
  const [themeId, setThemeId] = useState('');
  const [detail, setDetail] = useState<PublicDocumentTemplateDetail | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!activeBusiness) {
      setItems([]);
      setRegistry([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [list, reg, themeList] = await Promise.all([
        listTemplates(activeBusiness.id, { page: 1, pageSize: 50 }),
        fetchBlockRegistry(activeBusiness.id),
        listThemes(activeBusiness.id, { page: 1, pageSize: 50 }),
      ]);
      setItems(list.items);
      setRegistry(reg.items);
      setThemes(themeList.items.map((th) => ({ id: th.id, name: th.name })));
      const def = themeList.items.find((th) => th.isDefault);
      if (def && !themeId) setThemeId(def.id);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on business change
  }, [activeBusiness?.id]);

  async function onCreate() {
    if (!activeBusiness || !name.trim()) {
      setError(t('nameRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createTemplate(activeBusiness.id, {
        name: name.trim(),
        themeId: themeId || null,
      });
      setName('');
      setDetail(created);
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

  async function onOpen(id: string) {
    if (!activeBusiness) return;
    setBusy(true);
    setError(null);
    try {
      setDetail(await getTemplate(activeBusiness.id, id));
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

  async function onDelete(id: string) {
    if (!activeBusiness) return;
    if (!window.confirm(t('deleteConfirm'))) return;
    setBusy(true);
    setError(null);
    try {
      await deleteTemplate(activeBusiness.id, id);
      if (detail?.id === id) setDetail(null);
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
        <p className={styles.hint}>{t('needBusiness')}</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.hint}>{t('hint')}</p>

      <div className={styles.registry}>
        <h2 className={styles.sub}>{t('registryTitle')}</h2>
        <ul className={styles.chipList}>
          {registry.map((entry) => (
            <li key={entry.type} className={styles.chip}>
              {tBlocks(entry.labelKey as 'text')}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.create}>
        <label className={styles.field}>
          <span>{t('name')}</span>
          <input
            className={styles.input}
            value={name}
            disabled={!writable || busy || entLoading}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
          />
        </label>
        <label className={styles.field}>
          <span>{t('theme')}</span>
          <select
            className={styles.input}
            value={themeId}
            disabled={!writable || busy || entLoading}
            onChange={(e) => setThemeId(e.target.value)}
          >
            <option value="">{t('themeNone')}</option>
            {themes.map((th) => (
              <option key={th.id} value={th.id}>
                {th.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={styles.primary}
          disabled={!writable || busy || entLoading}
          onClick={() => void onCreate()}
        >
          {busy ? t('creating') : t('create')}
        </button>
      </div>

      {!writable ? <p className={styles.warn}>{t('readOnly')}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {loading ? (
        <p className={styles.hint}>{t('loading')}</p>
      ) : items.length === 0 ? (
        <p className={styles.hint}>{t('empty')}</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id} className={styles.card}>
              <div>
                <p className={styles.name}>{item.name}</p>
                <p className={styles.meta}>
                  {item.description || t('noDescription')}
                </p>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() => void onOpen(item.id)}
                >
                  {t('open')}
                </button>
                <button
                  type="button"
                  className={styles.danger}
                  disabled={!writable || busy}
                  onClick={() => void onDelete(item.id)}
                >
                  {t('delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {detail ? (
        <aside className={styles.detail}>
          <h2 className={styles.sub}>{t('detailTitle')}</h2>
          <p className={styles.name}>{detail.name}</p>
          <p className={styles.meta}>
            {t('blockCount', { count: countBlocks(detail.body) })}
          </p>
          <pre className={styles.pre}>{JSON.stringify(detail.body, null, 2)}</pre>
        </aside>
      ) : null}
    </section>
  );
}
