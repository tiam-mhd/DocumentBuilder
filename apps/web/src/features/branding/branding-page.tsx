'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PublicBusinessBranding } from '@vdb/shared-types';
import { EntitlementCodes } from '@vdb/shared-types';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import {
  brandingLogoAbsoluteUrl,
  deleteBrandingLogo,
  fetchBranding,
  updateBranding,
  uploadBrandingLogo,
} from '@/shared/api/branding';
import { useBusinesses } from '@/shared/lib/business-context';
import { useBusinessBranding } from '@/shared/lib/branding-context';
import { useMembershipPermissions } from '@/shared/lib/use-membership-permissions';
import { useEntitlements } from '@/features/billing/use-entitlements';
import { ModuleUpgradeCta } from '@/features/billing/module-upgrade-cta';
import { getStoredAccessToken } from '@/shared/lib/auth-storage';
import styles from './branding-page.module.css';

export function BrandingPage() {
  const t = useTranslations('branding');
  const tErrors = useTranslations('errors');
  const { activeBusiness } = useBusinesses();
  const { canManageSettings } = useMembershipPermissions();
  const { refresh: refreshShellBranding } = useBusinessBranding();
  const { has, loading: entLoading } = useEntitlements();
  const [branding, setBranding] = useState<PublicBusinessBranding | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1B4D3E');
  const [customDomain, setCustomDomain] = useState('');
  const [hidePoweredBy, setHidePoweredBy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoBlobUrl, setLogoBlobUrl] = useState<string | null>(null);

  const businessId = activeBusiness?.id;

  const applyBranding = useCallback(async (data: PublicBusinessBranding) => {
    setBranding(data);
    setDisplayName(data.displayName ?? '');
    setPrimaryColor(data.primaryColor ?? '#1B4D3E');
    setCustomDomain(data.customDomain ?? '');
    setHidePoweredBy(data.hidePoweredBy);
    setLogoBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (!data.hasLogo) return;
    const url = brandingLogoAbsoluteUrl(data.businessId, true);
    if (!url) return;
    const token = getStoredAccessToken();
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: 'no-store',
      });
      if (!res.ok) return;
      const blob = await res.blob();
      setLogoBlobUrl(URL.createObjectURL(blob));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchBranding(businessId);
        if (!cancelled) await applyBranding(data);
      } catch (err) {
        if (!cancelled) {
          const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
          setError(mapApiErrorCode(code, tErrors));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId, applyBranding, tErrors]);

  useEffect(() => {
    return () => {
      if (logoBlobUrl) URL.revokeObjectURL(logoBlobUrl);
    };
  }, [logoBlobUrl]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!businessId || !canManageSettings) return;
    setBusy(true);
    setError(null);
    try {
      const data = await updateBranding(businessId, {
        displayName: displayName.trim() || null,
        primaryColor: primaryColor.trim() || null,
        customDomain: customDomain.trim() || null,
        hidePoweredBy,
      });
      await applyBranding(data);
      await refreshShellBranding();
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setBusy(false);
    }
  }

  async function onLogoChange(file: File | null) {
    if (!businessId || !file || !canManageSettings) return;
    setBusy(true);
    setError(null);
    try {
      const data = await uploadBrandingLogo(businessId, file);
      await applyBranding(data);
      await refreshShellBranding();
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveLogo() {
    if (!businessId || !canManageSettings) return;
    setBusy(true);
    setError(null);
    try {
      const data = await deleteBrandingLogo(businessId);
      await applyBranding(data);
      await refreshShellBranding();
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setBusy(false);
    }
  }

  if (!businessId) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.hint}>{t('needBusiness')}</p>
      </section>
    );
  }

  const caps = branding?.capabilities;
  const locked = caps ? !caps.canCustomize : false;
  const showUpgrade =
    locked &&
    Boolean(caps?.requiresEntitlement) &&
    !entLoading &&
    !has(EntitlementCodes.BrandingWhiteLabel);

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.hint}>{t('hint')}</p>

      {showUpgrade ? (
        <div className={styles.upgrade}>
          <p>{t('upgradeHint')}</p>
          <ModuleUpgradeCta
            moduleCode={EntitlementCodes.BrandingWhiteLabel}
          />
        </div>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p className={styles.hint}>{t('loading')}</p> : null}

      <form className={styles.form} onSubmit={(e) => void onSave(e)}>
        <label className={styles.field}>
          {t('displayName')}
          <input
            className={styles.input}
            value={displayName}
            disabled={busy || locked || !canManageSettings}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('displayNamePlaceholder')}
          />
        </label>
        <label className={styles.field}>
          {t('primaryColor')}
          <input
            className={styles.color}
            type="color"
            value={primaryColor.length === 7 ? primaryColor : '#1B4D3E'}
            disabled={busy || locked || !canManageSettings}
            onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
          />
        </label>
        <label className={styles.field}>
          {t('customDomain')}
          <input
            className={styles.input}
            value={customDomain}
            disabled={
              busy || locked || !canManageSettings || !caps?.canSetCustomDomain
            }
            onChange={(e) => setCustomDomain(e.target.value)}
            placeholder={t('customDomainPlaceholder')}
          />
          <span className={styles.meta}>{t('customDomainHint')}</span>
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={hidePoweredBy}
            disabled={
              busy || locked || !canManageSettings || !caps?.canHidePoweredBy
            }
            onChange={(e) => setHidePoweredBy(e.target.checked)}
          />
          {t('hidePoweredBy')}
        </label>

        <div className={styles.logoBlock}>
          <p className={styles.fieldLabel}>{t('logo')}</p>
          {logoBlobUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoBlobUrl} alt="" className={styles.logoPreview} />
          ) : (
            <p className={styles.meta}>{t('noLogo')}</p>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy || locked || !canManageSettings}
            onChange={(e) => void onLogoChange(e.target.files?.[0] ?? null)}
          />
          {branding?.hasLogo ? (
            <button
              type="button"
              className={styles.secondary}
              disabled={busy || locked || !canManageSettings}
              onClick={() => void onRemoveLogo()}
            >
              {t('removeLogo')}
            </button>
          ) : null}
        </div>

        <button
          type="submit"
          className={styles.primary}
          disabled={busy || locked || !canManageSettings}
        >
          {t('save')}
        </button>
      </form>

      {branding ? (
        <p className={styles.meta}>
          {t('effectivePoweredBy', {
            value: branding.showPoweredByEffective
              ? t('poweredByOn')
              : t('poweredByOff'),
          })}
        </p>
      ) : null}
    </section>
  );
}
