'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PublicMediaAsset } from '@vdb/shared-types';
import {
  deleteMedia,
  fetchMediaBlobUrl,
  listMedia,
  uploadMedia,
} from '@/shared/api/media';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import { useEntitlements } from '@/features/billing/use-entitlements';
import styles from './media-library-page.module.css';

function MediaThumb({ asset }: { asset: PublicMediaAsset }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const path = asset.urls.thumb ?? asset.urls.original;
    void (async () => {
      try {
        objectUrl = await fetchMediaBlobUrl(path);
        if (!cancelled) setSrc(objectUrl);
      } catch {
        if (!cancelled) setSrc(null);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset]);

  if (!src) {
    return <div className={styles.thumbPlaceholder} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={styles.thumb} src={src} alt={asset.originalName} />
  );
}

export function MediaLibraryPage() {
  const t = useTranslations('media');
  const tErrors = useTranslations('errors');
  const { activeBusiness } = useBusinesses();
  const { writable, loading: entLoading } = useEntitlements();
  const [items, setItems] = useState<PublicMediaAsset[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refresh(search?: string) {
    if (!activeBusiness) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listMedia(activeBusiness.id, {
        page: 1,
        pageSize: 48,
        q: search,
      });
      setItems(data.items);
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [activeBusiness?.id]);

  async function onUpload(files: FileList | null) {
    if (!activeBusiness || !files?.length || !writable) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadMedia(activeBusiness.id, file);
      }
      await refresh(q);
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(assetId: string) {
    if (!activeBusiness || !writable) return;
    if (!window.confirm(t('deleteConfirm'))) return;
    setBusy(true);
    try {
      await deleteMedia(activeBusiness.id, assetId);
      setItems((prev) => prev.filter((i) => i.id !== assetId));
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setBusy(false);
    }
  }

  if (!activeBusiness) {
    return <p className={styles.hint}>{t('needBusiness')}</p>;
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.hint}>{t('hint')}</p>

      <div className={styles.toolbar}>
        <form
          className={styles.search}
          onSubmit={(e) => {
            e.preventDefault();
            void refresh(q);
          }}
        >
          <input
            className={styles.input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('searchPlaceholder')}
          />
          <button type="submit" className={styles.secondary}>
            {t('search')}
          </button>
        </form>
        <label className={styles.upload}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            disabled={!writable || busy || entLoading}
            onChange={(e) => {
              void onUpload(e.target.files);
              e.target.value = '';
            }}
          />
          <span>{busy ? t('uploading') : t('upload')}</span>
        </label>
      </div>

      {!writable ? <p className={styles.warn}>{t('readOnly')}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {loading ? (
        <p className={styles.hint}>{t('loading')}</p>
      ) : items.length === 0 ? (
        <p className={styles.hint}>{t('empty')}</p>
      ) : (
        <ul className={styles.grid}>
          {items.map((asset) => (
            <li key={asset.id} className={styles.card}>
              <MediaThumb asset={asset} />
              <p className={styles.name}>{asset.originalName}</p>
              <p className={styles.meta}>
                {asset.width && asset.height
                  ? `${asset.width}×${asset.height}`
                  : asset.mimeType}
              </p>
              <button
                type="button"
                className={styles.danger}
                disabled={!writable || busy}
                onClick={() => void onDelete(asset.id)}
              >
                {t('delete')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
