'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EntitlementCodes, type PublicMapMarker } from '@vdb/shared-types';
import { listMapMarkers } from '@/shared/api/map';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import { useEntitlements } from '@/features/billing/use-entitlements';
import { ModuleUpgradeCta } from '@/features/billing/module-upgrade-cta';
import { MapLeafletPreview } from './map-leaflet';
import styles from './team-page.module.css';

export function MapPage() {
  const t = useTranslations('map');
  const tErrors = useTranslations('errors');
  const { activeBusiness } = useBusinesses();
  const { can, loading: entLoading } = useEntitlements();
  const moduleOk = can(EntitlementCodes.ModuleMap);

  const [markers, setMarkers] = useState<PublicMapMarker[]>([]);
  const [source, setSource] = useState('locations');
  const [country, setCountry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!activeBusiness || !moduleOk) {
      setMarkers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await listMapMarkers(activeBusiness.id, {
        source,
        country: country.trim() || undefined,
      });
      setMarkers(list.items);
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
  }, [activeBusiness?.id, moduleOk, source]);

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
        <ModuleUpgradeCta moduleCode={EntitlementCodes.ModuleMap} />
      </section>
    );
  }

  const center = markers[0]
    ? { lat: markers[0].lat, lng: markers[0].lng }
    : { lat: 35.6892, lng: 51.389 };

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.sub}>{t('subtitle')}</p>
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.create}>
        <label className={styles.field}>
          {t('source')}
          <select
            className={styles.input}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="locations">{t('sourceLocations')}</option>
            <option value="branches">{t('sourceBranches')}</option>
            <option value="projects">{t('sourceProjects')}</option>
            <option value="none">{t('sourceNone')}</option>
          </select>
        </label>
        <label className={styles.field}>
          {t('country')}
          <input
            className={styles.input}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="IR"
          />
        </label>
        <button
          type="button"
          className={styles.primary}
          onClick={() => void refresh()}
        >
          {t('apply')}
        </button>
      </div>

      {loading ? <p className={styles.hint}>{t('loading')}</p> : null}
      <MapLeafletPreview
        centerLat={center.lat}
        centerLng={center.lng}
        zoom={10}
        markers={markers}
        heightPx={360}
      />
      <p className={styles.meta}>
        {t('markerCount', { count: markers.length })}
      </p>
    </section>
  );
}
