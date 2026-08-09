'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type {
  PublicBusinessService,
  PublicCertificate,
  PublicClient,
} from '@vdb/shared-types';
import {
  createCertificate,
  createClient,
  createService,
  deleteCertificate,
  deleteClient,
  deleteService,
  listCertificates,
  listClients,
  listServices,
} from '@/shared/api/profile-content';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import { useEntitlements } from '@/features/billing/use-entitlements';
import styles from './team-page.module.css';

export function ProfileContentPage() {
  const t = useTranslations('profileContent');
  const tErrors = useTranslations('errors');
  const { activeBusiness } = useBusinesses();
  const { writable, loading: entLoading } = useEntitlements();

  const [services, setServices] = useState<PublicBusinessService[]>([]);
  const [clients, setClients] = useState<PublicClient[]>([]);
  const [certs, setCerts] = useState<PublicCertificate[]>([]);

  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientWebsite, setClientWebsite] = useState('');
  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certIssued, setCertIssued] = useState('');
  const [certExpires, setCertExpires] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!activeBusiness) {
      setServices([]);
      setClients([]);
      setCerts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [s, c, cert] = await Promise.all([
        listServices(activeBusiness.id, { page: 1, pageSize: 100 }),
        listClients(activeBusiness.id, { page: 1, pageSize: 100 }),
        listCertificates(activeBusiness.id, { page: 1, pageSize: 100 }),
      ]);
      setServices(s.items);
      setClients(c.items);
      setCerts(cert.items);
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

  async function onCreateService() {
    if (!activeBusiness || !serviceName.trim()) {
      setError(t('serviceNameRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createService(activeBusiness.id, {
        name: serviceName.trim(),
        description: serviceDesc.trim(),
      });
      setServiceName('');
      setServiceDesc('');
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

  async function onCreateClient() {
    if (!activeBusiness || !clientName.trim()) {
      setError(t('clientNameRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createClient(activeBusiness.id, {
        name: clientName.trim(),
        website: clientWebsite.trim(),
      });
      setClientName('');
      setClientWebsite('');
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

  async function onCreateCert() {
    if (!activeBusiness || !certName.trim()) {
      setError(t('certNameRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createCertificate(activeBusiness.id, {
        name: certName.trim(),
        issuer: certIssuer.trim(),
        issuedAt: certIssued
          ? new Date(certIssued).toISOString()
          : null,
        expiresAt: certExpires
          ? new Date(certExpires).toISOString()
          : null,
      });
      setCertName('');
      setCertIssuer('');
      setCertIssued('');
      setCertExpires('');
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

  async function onDeleteService(id: string) {
    if (!activeBusiness) return;
    setBusy(true);
    setError(null);
    try {
      await deleteService(activeBusiness.id, id);
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

  async function onDeleteClient(id: string) {
    if (!activeBusiness) return;
    setBusy(true);
    setError(null);
    try {
      await deleteClient(activeBusiness.id, id);
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

  async function onDeleteCert(id: string) {
    if (!activeBusiness) return;
    setBusy(true);
    setError(null);
    try {
      await deleteCertificate(activeBusiness.id, id);
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

      <h2 className={styles.h2}>{t('servicesTitle')}</h2>
      <div className={styles.create}>
        <label className={styles.field}>
          {t('serviceName')}
          <input
            className={styles.input}
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <label className={styles.field}>
          {t('serviceDescription')}
          <input
            className={styles.input}
            value={serviceDesc}
            onChange={(e) => setServiceDesc(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <button
          type="button"
          className={styles.primary}
          disabled={!writable || busy}
          onClick={() => void onCreateService()}
        >
          {t('addService')}
        </button>
      </div>
      <ul className={styles.list}>
        {services.map((s) => (
          <li key={s.id} className={styles.row}>
            <div>
              <strong>{s.name}</strong>
              <p className={styles.meta}>
                {s.description || t('noDescription')}
              </p>
            </div>
            <button
              type="button"
              className={styles.danger}
              disabled={!writable || busy}
              onClick={() => void onDeleteService(s.id)}
            >
              {t('delete')}
            </button>
          </li>
        ))}
        {!loading && services.length === 0 ? (
          <li className={styles.meta}>{t('emptyServices')}</li>
        ) : null}
      </ul>

      <h2 className={styles.h2}>{t('clientsTitle')}</h2>
      <div className={styles.create}>
        <label className={styles.field}>
          {t('clientName')}
          <input
            className={styles.input}
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <label className={styles.field}>
          {t('clientWebsite')}
          <input
            className={styles.input}
            value={clientWebsite}
            onChange={(e) => setClientWebsite(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <button
          type="button"
          className={styles.primary}
          disabled={!writable || busy}
          onClick={() => void onCreateClient()}
        >
          {t('addClient')}
        </button>
      </div>
      <ul className={styles.list}>
        {clients.map((c) => (
          <li key={c.id} className={styles.row}>
            <div>
              <strong>{c.name}</strong>
              <p className={styles.meta}>{c.website || t('noWebsite')}</p>
            </div>
            <button
              type="button"
              className={styles.danger}
              disabled={!writable || busy}
              onClick={() => void onDeleteClient(c.id)}
            >
              {t('delete')}
            </button>
          </li>
        ))}
        {!loading && clients.length === 0 ? (
          <li className={styles.meta}>{t('emptyClients')}</li>
        ) : null}
      </ul>

      <h2 className={styles.h2}>{t('certsTitle')}</h2>
      <div className={styles.create}>
        <label className={styles.field}>
          {t('certName')}
          <input
            className={styles.input}
            value={certName}
            onChange={(e) => setCertName(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <label className={styles.field}>
          {t('certIssuer')}
          <input
            className={styles.input}
            value={certIssuer}
            onChange={(e) => setCertIssuer(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <label className={styles.field}>
          {t('certIssued')}
          <input
            className={styles.input}
            type="date"
            value={certIssued}
            onChange={(e) => setCertIssued(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <label className={styles.field}>
          {t('certExpires')}
          <input
            className={styles.input}
            type="date"
            value={certExpires}
            onChange={(e) => setCertExpires(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <button
          type="button"
          className={styles.primary}
          disabled={!writable || busy}
          onClick={() => void onCreateCert()}
        >
          {t('addCert')}
        </button>
      </div>
      <ul className={styles.list}>
        {certs.map((c) => (
          <li key={c.id} className={styles.row}>
            <div>
              <strong>{c.name}</strong>
              <p className={styles.meta}>
                {c.issuer || t('noIssuer')}
                {c.issuedAt
                  ? ` · ${new Date(c.issuedAt).toLocaleDateString()}`
                  : ''}
                {c.expiresAt
                  ? ` → ${new Date(c.expiresAt).toLocaleDateString()}`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              className={styles.danger}
              disabled={!writable || busy}
              onClick={() => void onDeleteCert(c.id)}
            >
              {t('delete')}
            </button>
          </li>
        ))}
        {!loading && certs.length === 0 ? (
          <li className={styles.meta}>{t('emptyCerts')}</li>
        ) : null}
      </ul>
    </section>
  );
}
