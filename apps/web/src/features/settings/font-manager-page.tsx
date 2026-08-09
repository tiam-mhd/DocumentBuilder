'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PublicFontFace } from '@vdb/shared-types';
import { deleteFont, listFonts, uploadFont } from '@/shared/api/fonts';
import { ApiClientError, getApiBaseUrl, mapApiErrorCode } from '@/shared/api/client';
import { getStoredAccessToken } from '@/shared/lib/auth-storage';
import { useBusinesses } from '@/shared/lib/business-context';
import { useEntitlements } from '@/features/billing/use-entitlements';
import styles from './font-manager-page.module.css';

const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

function FontPreview({ face, sample }: { face: PublicFontFace; sample: string }) {
  const [ready, setReady] = useState(false);
  const cssFamily = `vdb-font-${face.id}`;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    void (async () => {
      try {
        const token = getStoredAccessToken();
        const res = await fetch(`${getApiBaseUrl()}${face.fileUrl}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: 'no-store',
        });
        if (!res.ok) return;
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        const loaded = new FontFace(cssFamily, `url(${objectUrl})`, {
          weight: String(face.weight),
          style: face.style === 'italic' ? 'italic' : 'normal',
        });
        await loaded.load();
        document.fonts.add(loaded);
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setReady(false);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [face, cssFamily]);

  return (
    <p
      className={styles.preview}
      style={{
        fontFamily: ready
          ? `"${cssFamily}", var(--font-sans, sans-serif)`
          : 'var(--font-sans, sans-serif)',
        fontWeight: face.weight,
        fontStyle: face.style === 'italic' ? 'italic' : 'normal',
        opacity: ready ? 1 : 0.55,
      }}
    >
      {sample}
    </p>
  );
}

export function FontManagerPage() {
  const t = useTranslations('fonts');
  const tErrors = useTranslations('errors');
  const { activeBusiness } = useBusinesses();
  const { writable, loading: entLoading } = useEntitlements();
  const [items, setItems] = useState<PublicFontFace[]>([]);
  const [q, setQ] = useState('');
  const [family, setFamily] = useState('');
  const [weight, setWeight] = useState(400);
  const [style, setStyle] = useState<'normal' | 'italic'>('normal');
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
      const data = await listFonts(activeBusiness.id, {
        page: 1,
        pageSize: 100,
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
    if (!activeBusiness || !files?.[0] || !writable) return;
    if (!family.trim()) {
      setError(t('familyRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await uploadFont(activeBusiness.id, {
        file: files[0],
        family: family.trim(),
        weight,
        style,
      });
      setFamily('');
      await refresh(q);
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(fontId: string) {
    if (!activeBusiness || !writable) return;
    if (!window.confirm(t('deleteConfirm'))) return;
    setBusy(true);
    try {
      await deleteFont(activeBusiness.id, fontId);
      setItems((prev) => prev.filter((i) => i.id !== fontId));
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

      <div className={styles.uploadPanel}>
        <label className={styles.field}>
          {t('family')}
          <input
            className={styles.input}
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            disabled={!writable}
            placeholder={t('familyPlaceholder')}
          />
        </label>
        <label className={styles.field}>
          {t('weight')}
          <select
            className={styles.input}
            value={weight}
            disabled={!writable}
            onChange={(e) => setWeight(Number(e.target.value))}
          >
            {WEIGHTS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          {t('style')}
          <select
            className={styles.input}
            value={style}
            disabled={!writable}
            onChange={(e) =>
              setStyle(e.target.value === 'italic' ? 'italic' : 'normal')
            }
          >
            <option value="normal">{t('styleNormal')}</option>
            <option value="italic">{t('styleItalic')}</option>
          </select>
        </label>
        <label className={styles.upload}>
          <input
            type="file"
            accept=".woff2,.ttf,.otf,font/woff2,font/ttf,font/otf"
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
        <ul className={styles.list}>
          {items.map((face) => (
            <li key={face.id} className={styles.card}>
              <FontPreview face={face} sample={t('previewSample')} />
              <p className={styles.name}>
                {face.family} · {face.weight} · {face.style}
              </p>
              <p className={styles.meta}>
                {face.originalName} · {face.storageKey}
              </p>
              <button
                type="button"
                className={styles.danger}
                disabled={!writable || busy}
                onClick={() => void onDelete(face.id)}
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
