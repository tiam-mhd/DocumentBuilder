'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  EntitlementCodes,
  type PublicGallery,
  type PublicGalleryItem,
  type PublicMediaAsset,
} from '@vdb/shared-types';
import {
  addGalleryItem,
  createGallery,
  deleteGallery,
  deleteGalleryItem,
  getGallery,
  listGalleries,
  reorderGalleryItems,
  updateGalleryItem,
} from '@/shared/api/galleries';
import { listMedia } from '@/shared/api/media';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import { useEntitlements } from '@/features/billing/use-entitlements';
import { ModuleUpgradeCta } from '@/features/billing/module-upgrade-cta';
import styles from './team-page.module.css';

export function GalleryPage() {
  const t = useTranslations('gallery');
  const tErrors = useTranslations('errors');
  const { activeBusiness } = useBusinesses();
  const { writable, loading: entLoading, can } = useEntitlements();
  const moduleOk = can(EntitlementCodes.ModuleGallery);
  const canMutate = writable && moduleOk;

  const [albums, setAlbums] = useState<PublicGallery[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PublicGallery | null>(null);
  const [media, setMedia] = useState<PublicMediaAsset[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mediaId, setMediaId] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refreshList() {
    if (!activeBusiness || !moduleOk) {
      setAlbums([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [list, mediaList] = await Promise.all([
        listGalleries(activeBusiness.id, { page: 1, pageSize: 100 }),
        listMedia(activeBusiness.id, { page: 1, pageSize: 100 }),
      ]);
      setAlbums(list.items);
      setMedia(mediaList.items);
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

  async function refreshDetail(galleryId: string) {
    if (!activeBusiness) return;
    try {
      const g = await getGallery(activeBusiness.id, galleryId);
      setDetail(g);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(mapApiErrorCode(err.code, tErrors));
      } else {
        setError(tErrors('UNKNOWN'));
      }
    }
  }

  useEffect(() => {
    void refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusiness?.id, moduleOk]);

  useEffect(() => {
    if (selectedId) void refreshDetail(selectedId);
    else setDetail(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, activeBusiness?.id]);

  async function onCreate() {
    if (!activeBusiness || !name.trim()) {
      setError(t('nameRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const g = await createGallery(activeBusiness.id, {
        name: name.trim(),
        description: description.trim(),
      });
      setName('');
      setDescription('');
      await refreshList();
      setSelectedId(g.id);
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

  async function onDeleteAlbum(id: string) {
    if (!activeBusiness) return;
    setBusy(true);
    setError(null);
    try {
      await deleteGallery(activeBusiness.id, id);
      if (selectedId === id) setSelectedId(null);
      await refreshList();
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

  async function onAddItem() {
    if (!activeBusiness || !selectedId || !mediaId) {
      setError(t('mediaRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addGalleryItem(activeBusiness.id, selectedId, {
        mediaId,
        caption: caption.trim(),
      });
      setCaption('');
      await refreshDetail(selectedId);
      await refreshList();
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

  async function onDeleteItem(itemId: string) {
    if (!activeBusiness || !selectedId) return;
    setBusy(true);
    setError(null);
    try {
      await deleteGalleryItem(activeBusiness.id, selectedId, itemId);
      await refreshDetail(selectedId);
      await refreshList();
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

  async function moveItem(itemId: string, dir: -1 | 1) {
    if (!activeBusiness || !selectedId || !detail?.items) return;
    const items = [...detail.items].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const idx = items.findIndex((i) => i.id === itemId);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= items.length) return;
    const next = [...items];
    const tmp = next[idx]!;
    next[idx] = next[swap]!;
    next[swap] = tmp;
    setBusy(true);
    setError(null);
    try {
      const g = await reorderGalleryItems(
        activeBusiness.id,
        selectedId,
        next.map((i) => i.id),
      );
      setDetail(g);
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

  async function onSaveCaption(item: PublicGalleryItem, value: string) {
    if (!activeBusiness || !selectedId) return;
    setBusy(true);
    setError(null);
    try {
      await updateGalleryItem(activeBusiness.id, selectedId, item.id, {
        caption: value,
      });
      await refreshDetail(selectedId);
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
        <ModuleUpgradeCta moduleCode={EntitlementCodes.ModuleGallery} />
      </section>
    );
  }

  const items = [...(detail?.items ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.sub}>{t('subtitle')}</p>
      {!writable ? <p className={styles.warn}>{t('readOnly')}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p className={styles.hint}>{t('loading')}</p> : null}

      <h2 className={styles.h2}>{t('albumsTitle')}</h2>
      <div className={styles.create}>
        <label className={styles.field}>
          {t('name')}
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
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
        <button
          type="button"
          className={styles.primary}
          disabled={!canMutate || busy}
          onClick={() => void onCreate()}
        >
          {t('addAlbum')}
        </button>
      </div>
      <ul className={styles.list}>
        {albums.map((g) => (
          <li key={g.id} className={styles.row}>
            <button
              type="button"
              className={styles.primary}
              onClick={() => setSelectedId(g.id)}
              disabled={busy}
            >
              {g.name} ({g.itemCount})
            </button>
            <button
              type="button"
              className={styles.danger}
              disabled={!canMutate || busy}
              onClick={() => void onDeleteAlbum(g.id)}
            >
              {t('delete')}
            </button>
          </li>
        ))}
        {!loading && albums.length === 0 ? (
          <li className={styles.meta}>{t('emptyAlbums')}</li>
        ) : null}
      </ul>

      {selectedId && detail ? (
        <>
          <h2 className={styles.h2}>
            {t('itemsTitle')}: {detail.name}
          </h2>
          <div className={styles.create}>
            <label className={styles.field}>
              {t('media')}
              <select
                className={styles.input}
                value={mediaId}
                onChange={(e) => setMediaId(e.target.value)}
                disabled={!canMutate || busy}
              >
                <option value="">{t('mediaPick')}</option>
                {media.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.originalName || m.id}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              {t('caption')}
              <input
                className={styles.input}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={!canMutate || busy}
              />
            </label>
            <button
              type="button"
              className={styles.primary}
              disabled={!canMutate || busy}
              onClick={() => void onAddItem()}
            >
              {t('addItem')}
            </button>
          </div>
          <ul className={styles.list}>
            {items.map((item, index) => (
              <li key={item.id} className={styles.row}>
                <div>
                  <strong>
                    #{index + 1} · {item.mediaId.slice(0, 8)}…
                  </strong>
                  <p className={styles.meta}>
                    <input
                      className={styles.input}
                      defaultValue={item.caption}
                      disabled={!canMutate || busy}
                      onBlur={(e) => {
                        if (e.target.value !== item.caption) {
                          void onSaveCaption(item, e.target.value);
                        }
                      }}
                      aria-label={t('caption')}
                    />
                  </p>
                </div>
                <div className={styles.create}>
                  <button
                    type="button"
                    className={styles.primary}
                    disabled={!canMutate || busy || index === 0}
                    onClick={() => void moveItem(item.id, -1)}
                  >
                    {t('moveUp')}
                  </button>
                  <button
                    type="button"
                    className={styles.primary}
                    disabled={
                      !canMutate || busy || index === items.length - 1
                    }
                    onClick={() => void moveItem(item.id, 1)}
                  >
                    {t('moveDown')}
                  </button>
                  <button
                    type="button"
                    className={styles.danger}
                    disabled={!canMutate || busy}
                    onClick={() => void onDeleteItem(item.id)}
                  >
                    {t('delete')}
                  </button>
                </div>
              </li>
            ))}
            {items.length === 0 ? (
              <li className={styles.meta}>{t('emptyItems')}</li>
            ) : null}
          </ul>
        </>
      ) : null}
    </section>
  );
}
