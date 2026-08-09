'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useBusinesses } from '@/shared/lib/business-context';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import styles from './businesses-page.module.css';

export function BusinessesPage() {
  const t = useTranslations('businesses');
  const tErrors = useTranslations('errors');
  const {
    businesses,
    activeBusiness,
    loading,
    create,
    rename,
    remove,
    selectBusiness,
  } = useBusinesses();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await create(name.trim());
      setName('');
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setBusy(false);
    }
  }

  async function onRename(businessId: string, current: string) {
    const next = window.prompt(t('renamePrompt'), current);
    if (!next || next.trim() === current) return;
    setBusy(true);
    setError(null);
    try {
      await rename(businessId, next.trim());
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(businessId: string, businessName: string) {
    if (!window.confirm(t('deleteConfirm', { name: businessName }))) return;
    setBusy(true);
    setError(null);
    try {
      await remove(businessId);
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.hint}>{t('hint')}</p>

      <form className={styles.createForm} onSubmit={onCreate}>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('namePlaceholder')}
          minLength={2}
          required
        />
        <button className={styles.primary} type="submit" disabled={busy}>
          {t('create')}
        </button>
      </form>

      {error ? <p className={styles.error}>{error}</p> : null}

      {loading ? (
        <p className={styles.hint}>{t('loading')}</p>
      ) : businesses.length === 0 ? (
        <p className={styles.hint}>{t('empty')}</p>
      ) : (
        <ul className={styles.list}>
          {businesses.map((business) => {
            const isActive = activeBusiness?.id === business.id;
            return (
              <li
                key={business.id}
                className={isActive ? styles.itemActive : styles.item}
              >
                <div>
                  <p className={styles.itemName}>{business.name}</p>
                  <p className={styles.itemMeta}>
                    {t('role', { role: business.role })}
                    {isActive ? ` · ${t('active')}` : ''}
                  </p>
                </div>
                <div className={styles.actions}>
                  {!isActive ? (
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => selectBusiness(business.id)}
                    >
                      {t('select')}
                    </button>
                  ) : null}
                  {business.role === 'OWNER' ? (
                    <>
                      <button
                        type="button"
                        className={styles.secondary}
                        onClick={() => void onRename(business.id, business.name)}
                        disabled={busy}
                      >
                        {t('rename')}
                      </button>
                      <button
                        type="button"
                        className={styles.danger}
                        onClick={() => void onDelete(business.id, business.name)}
                        disabled={busy}
                      >
                        {t('delete')}
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
