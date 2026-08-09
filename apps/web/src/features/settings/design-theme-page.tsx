'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import {
  DEFAULT_DESIGN_THEME_TOKENS,
  type DesignThemeTokens,
  type PublicDesignTheme,
  type PublicFontFace,
} from '@vdb/shared-types';
import { getDefaultTheme, updateTheme } from '@/shared/api/themes';
import { listFonts } from '@/shared/api/fonts';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import { useEntitlements } from '@/features/billing/use-entitlements';
import styles from './design-theme-page.module.css';

const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

function cloneTokens(tokens: DesignThemeTokens): DesignThemeTokens {
  return {
    colors: { ...tokens.colors },
    typography: { ...tokens.typography },
    fonts: { ...tokens.fonts },
  };
}

export function DesignThemePage() {
  const t = useTranslations('designTheme');
  const tErrors = useTranslations('errors');
  const { activeBusiness } = useBusinesses();
  const { writable, loading: entLoading } = useEntitlements();
  const [theme, setTheme] = useState<PublicDesignTheme | null>(null);
  const [draft, setDraft] = useState<DesignThemeTokens>(
    cloneTokens(DEFAULT_DESIGN_THEME_TOKENS),
  );
  const [name, setName] = useState('');
  const [fonts, setFonts] = useState<PublicFontFace[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savedHint, setSavedHint] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!activeBusiness) {
        setTheme(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [defaultTheme, fontList] = await Promise.all([
          getDefaultTheme(activeBusiness.id),
          listFonts(activeBusiness.id, { page: 1, pageSize: 100 }),
        ]);
        if (cancelled) return;
        setTheme(defaultTheme);
        setName(defaultTheme.name);
        setDraft(cloneTokens(defaultTheme.tokens));
        setFonts(fontList.items);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiClientError) {
          setError(mapApiErrorCode(err.code, tErrors));
        } else {
          setError(tErrors('UNKNOWN'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBusiness, tErrors]);

  function patchColors(
    key: keyof DesignThemeTokens['colors'],
    value: string,
  ) {
    setDraft((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
    setSavedHint(false);
  }

  function patchTypography(
    key: keyof DesignThemeTokens['typography'],
    value: string | number,
  ) {
    setDraft((prev) => ({
      ...prev,
      typography: { ...prev.typography, [key]: value },
    }));
    setSavedHint(false);
  }

  function onFontSelect(
    slot: 'headingFontFaceId' | 'bodyFontFaceId',
    fontId: string,
  ) {
    const face = fonts.find((f) => f.id === fontId) ?? null;
    setDraft((prev) => {
      const fontsNext = {
        ...prev.fonts,
        [slot]: face ? face.id : null,
      };
      const typography = { ...prev.typography };
      if (slot === 'headingFontFaceId' && face) {
        typography.headingFamily = face.family;
        typography.headingWeight = face.weight;
      }
      if (slot === 'bodyFontFaceId' && face) {
        typography.bodyFamily = face.family;
        typography.bodyWeight = face.weight;
      }
      return { ...prev, fonts: fontsNext, typography };
    });
    setSavedHint(false);
  }

  async function onSave() {
    if (!activeBusiness || !theme) return;
    setBusy(true);
    setError(null);
    setSavedHint(false);
    try {
      const updated = await updateTheme(activeBusiness.id, theme.id, {
        name,
        tokens: draft,
      });
      setTheme(updated);
      setName(updated.name);
      setDraft(cloneTokens(updated.tokens));
      setSavedHint(true);
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

  const previewStyle: CSSProperties = {
    background: draft.colors.background,
    color: draft.colors.text,
    fontFamily: `"${draft.typography.bodyFamily}", var(--font-sans, sans-serif)`,
    fontWeight: draft.typography.bodyWeight,
    fontSize: `${draft.typography.baseSizePx}px`,
  };

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.hint}>{t('hint')}</p>

      {loading ? (
        <p className={styles.hint}>{t('loading')}</p>
      ) : (
        <>
          <div
            className={styles.preview}
            style={previewStyle}
            data-testid="design-theme-preview"
          >
            <p
              className={styles.previewEyebrow}
              style={{ color: draft.colors.secondary }}
            >
              {t('previewEyebrow')}
            </p>
            <h2
              className={styles.previewHeading}
              style={{
                color: draft.colors.primary,
                fontFamily: `"${draft.typography.headingFamily}", var(--font-sans, sans-serif)`,
                fontWeight: draft.typography.headingWeight,
              }}
            >
              {t('previewHeading')}
            </h2>
            <p className={styles.previewBody}>{t('previewBody')}</p>
            <div className={styles.swatches}>
              {(
                [
                  'primary',
                  'secondary',
                  'text',
                  'background',
                ] as const
              ).map((key) => (
                <span
                  key={key}
                  className={styles.swatch}
                  style={{ background: draft.colors[key] }}
                  title={key}
                />
              ))}
            </div>
          </div>

          <div className={styles.form}>
            <label className={styles.field}>
              <span>{t('name')}</span>
              <input
                className={styles.input}
                value={name}
                disabled={!writable || busy || entLoading}
                onChange={(e) => {
                  setName(e.target.value);
                  setSavedHint(false);
                }}
              />
            </label>

            <fieldset className={styles.fieldset}>
              <legend>{t('colors')}</legend>
              {(
                [
                  ['primary', t('colorPrimary')],
                  ['secondary', t('colorSecondary')],
                  ['text', t('colorText')],
                  ['background', t('colorBackground')],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className={styles.colorRow}>
                  <span>{label}</span>
                  <input
                    type="color"
                    value={
                      draft.colors[key].length === 4
                        ? `#${draft.colors[key][1]}${draft.colors[key][1]}${draft.colors[key][2]}${draft.colors[key][2]}${draft.colors[key][3]}${draft.colors[key][3]}`
                        : draft.colors[key]
                    }
                    disabled={!writable || busy || entLoading}
                    onChange={(e) => patchColors(key, e.target.value)}
                  />
                  <input
                    className={styles.input}
                    value={draft.colors[key]}
                    disabled={!writable || busy || entLoading}
                    onChange={(e) => patchColors(key, e.target.value)}
                  />
                </label>
              ))}
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend>{t('typography')}</legend>
              <label className={styles.field}>
                <span>{t('headingFamily')}</span>
                <input
                  className={styles.input}
                  value={draft.typography.headingFamily}
                  disabled={!writable || busy || entLoading}
                  onChange={(e) =>
                    patchTypography('headingFamily', e.target.value)
                  }
                />
              </label>
              <label className={styles.field}>
                <span>{t('bodyFamily')}</span>
                <input
                  className={styles.input}
                  value={draft.typography.bodyFamily}
                  disabled={!writable || busy || entLoading}
                  onChange={(e) =>
                    patchTypography('bodyFamily', e.target.value)
                  }
                />
              </label>
              <label className={styles.field}>
                <span>{t('headingWeight')}</span>
                <select
                  className={styles.input}
                  value={draft.typography.headingWeight}
                  disabled={!writable || busy || entLoading}
                  onChange={(e) =>
                    patchTypography('headingWeight', Number(e.target.value))
                  }
                >
                  {WEIGHTS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>{t('bodyWeight')}</span>
                <select
                  className={styles.input}
                  value={draft.typography.bodyWeight}
                  disabled={!writable || busy || entLoading}
                  onChange={(e) =>
                    patchTypography('bodyWeight', Number(e.target.value))
                  }
                >
                  {WEIGHTS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>{t('baseSize')}</span>
                <input
                  className={styles.input}
                  type="number"
                  min={10}
                  max={32}
                  value={draft.typography.baseSizePx}
                  disabled={!writable || busy || entLoading}
                  onChange={(e) =>
                    patchTypography('baseSizePx', Number(e.target.value))
                  }
                />
              </label>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend>{t('fontFaces')}</legend>
              <p className={styles.meta}>{t('fontFacesHint')}</p>
              <label className={styles.field}>
                <span>{t('headingFontFace')}</span>
                <select
                  className={styles.input}
                  value={draft.fonts.headingFontFaceId ?? ''}
                  disabled={!writable || busy || entLoading}
                  onChange={(e) =>
                    onFontSelect('headingFontFaceId', e.target.value)
                  }
                >
                  <option value="">{t('fontNone')}</option>
                  {fonts.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.family} · {f.weight} · {f.style}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>{t('bodyFontFace')}</span>
                <select
                  className={styles.input}
                  value={draft.fonts.bodyFontFaceId ?? ''}
                  disabled={!writable || busy || entLoading}
                  onChange={(e) =>
                    onFontSelect('bodyFontFaceId', e.target.value)
                  }
                >
                  <option value="">{t('fontNone')}</option>
                  {fonts.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.family} · {f.weight} · {f.style}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>

            {!writable ? <p className={styles.warn}>{t('readOnly')}</p> : null}
            {error ? <p className={styles.error}>{error}</p> : null}
            {savedHint ? <p className={styles.ok}>{t('saved')}</p> : null}

            <button
              type="button"
              className={styles.primary}
              disabled={!writable || busy || entLoading}
              onClick={() => void onSave()}
            >
              {busy ? t('saving') : t('save')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
