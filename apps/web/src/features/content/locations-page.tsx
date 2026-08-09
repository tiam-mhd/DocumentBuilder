'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PublicLocation } from '@vdb/shared-types';
import {
  createLocation,
  deleteLocation,
  listLocations,
} from '@/shared/api/locations';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import { useEntitlements } from '@/features/billing/use-entitlements';
import styles from './team-page.module.css';

export function LocationsPage() {
  const t = useTranslations('locations');
  const tErrors = useTranslations('errors');
  const { activeBusiness } = useBusinesses();
  const { writable, loading: entLoading } = useEntitlements();

  const [items, setItems] = useState<PublicLocation[]>([]);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [country, setCountry] = useState('IR');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('35.6892');
  const [lng, setLng] = useState('51.3890');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!activeBusiness) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await listLocations(activeBusiness.id, {
        page: 1,
        pageSize: 100,
      });
      setItems(list.items);
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

  async function onCreate() {
    if (!activeBusiness || !name.trim()) {
      setError(t('nameRequired'));
      return;
    }
    const latN = Number(lat);
    const lngN = Number(lng);
    if (Number.isNaN(latN) || Number.isNaN(lngN)) {
      setError(t('coordsRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createLocation(activeBusiness.id, {
        name: name.trim(),
        city: city.trim(),
        province: province.trim(),
        country: country.trim(),
        address: address.trim(),
        lat: latN,
        lng: lngN,
      });
      setName('');
      setCity('');
      setProvince('');
      setAddress('');
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

  async function onDelete(id: string) {
    if (!activeBusiness) return;
    setBusy(true);
    setError(null);
    try {
      await deleteLocation(activeBusiness.id, id);
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
      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p className={styles.hint}>{t('loading')}</p> : null}

      <div className={styles.create}>
        <label className={styles.field}>
          {t('name')}
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
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
          {t('province')}
          <input
            className={styles.input}
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <label className={styles.field}>
          {t('country')}
          <input
            className={styles.input}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <label className={styles.field}>
          {t('address')}
          <input
            className={styles.input}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <label className={styles.field}>
          {t('lat')}
          <input
            className={styles.input}
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <label className={styles.field}>
          {t('lng')}
          <input
            className={styles.input}
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <button
          type="button"
          className={styles.primary}
          disabled={!writable || busy}
          onClick={() => void onCreate()}
        >
          {t('add')}
        </button>
      </div>

      <ul className={styles.list}>
        {items.map((loc) => (
          <li key={loc.id} className={styles.row}>
            <div>
              <strong>{loc.name}</strong>
              <p className={styles.meta}>
                {[loc.city, loc.province, loc.country]
                  .filter(Boolean)
                  .join(' · ') || t('noPlace')}
                {` · ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`}
              </p>
            </div>
            <button
              type="button"
              className={styles.danger}
              disabled={!writable || busy}
              onClick={() => void onDelete(loc.id)}
            >
              {t('delete')}
            </button>
          </li>
        ))}
        {!loading && items.length === 0 ? (
          <li className={styles.meta}>{t('empty')}</li>
        ) : null}
      </ul>
    </section>
  );
}
