'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  EntitlementCodes,
  type PublicTimelineEvent,
} from '@vdb/shared-types';
import {
  createTimelineEvent,
  deleteTimelineEvent,
  listTimelineEvents,
} from '@/shared/api/timeline';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import { useEntitlements } from '@/features/billing/use-entitlements';
import { ModuleUpgradeCta } from '@/features/billing/module-upgrade-cta';
import { TimelineView } from './timeline-view';
import {
  EnTranslationFields,
  buildEnTranslations,
} from './en-translation-fields';
import styles from './team-page.module.css';

export function TimelinePage() {
  const t = useTranslations('timeline');
  const tErrors = useTranslations('errors');
  const { activeBusiness } = useBusinesses();
  const { can, writable, loading: entLoading } = useEntitlements();
  const moduleOk = can(EntitlementCodes.ModuleTimeline);

  const [items, setItems] = useState<PublicTimelineEvent[]>([]);
  const [layout, setLayout] = useState<'vertical' | 'alternating'>('vertical');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!activeBusiness || !moduleOk) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await listTimelineEvents(activeBusiness.id, {
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
  }, [activeBusiness?.id, moduleOk]);

  async function onCreate() {
    if (!activeBusiness || !title.trim() || !occurredAt.trim()) {
      setError(t('required'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createTimelineEvent(activeBusiness.id, {
        title: title.trim(),
        occurredAt: occurredAt.trim(),
        body: body.trim(),
        translations: buildEnTranslations({
          title: titleEn,
          body: bodyEn,
        }),
      });
      setTitle('');
      setBody('');
      setTitleEn('');
      setBodyEn('');
      setOccurredAt('');
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
      await deleteTimelineEvent(activeBusiness.id, id);
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

  if (!moduleOk) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.warn}>{t('moduleRequired')}</p>
        <ModuleUpgradeCta moduleCode={EntitlementCodes.ModuleTimeline} />
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.sub}>{t('subtitle')}</p>
      {!writable ? <p className={styles.warn}>{t('readOnly')}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.create}>
        <label className={styles.field}>
          {t('date')}
          <input
            className={styles.input}
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <label className={styles.field}>
          {t('eventTitle')}
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <label className={styles.field}>
          {t('body')}
          <input
            className={styles.input}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={!writable || busy}
          />
        </label>
        <EnTranslationFields
          fieldClassName={styles.field}
          inputClassName={styles.input}
          disabled={!writable || busy}
          fields={[
            {
              key: 'title',
              label: t('titleEn'),
              value: titleEn,
              onChange: setTitleEn,
            },
            {
              key: 'body',
              label: t('bodyEn'),
              value: bodyEn,
              onChange: setBodyEn,
            },
          ]}
        />
        <button
          type="button"
          className={styles.primary}
          disabled={!writable || busy}
          onClick={() => void onCreate()}
        >
          {t('add')}
        </button>
      </div>

      <div className={styles.create}>
        <label className={styles.field}>
          {t('layout')}
          <select
            className={styles.input}
            value={layout}
            onChange={(e) =>
              setLayout(e.target.value as 'vertical' | 'alternating')
            }
          >
            <option value="vertical">{t('layoutVertical')}</option>
            <option value="alternating">{t('layoutAlternating')}</option>
          </select>
        </label>
      </div>

      {loading ? <p className={styles.hint}>{t('loading')}</p> : null}
      {!loading && items.length === 0 ? (
        <p className={styles.hint}>{t('empty')}</p>
      ) : (
        <TimelineView items={items} layout={layout} heightPx={480} />
      )}

      <ul className={styles.list}>
        {items.map((ev) => (
          <li key={ev.id} className={styles.card}>
            <div>
              <p className={styles.cardTitle}>{ev.title}</p>
              <p className={styles.meta}>
                {ev.occurredAt.slice(0, 10)}
                {ev.body ? ` · ${ev.body}` : ''}
              </p>
            </div>
            <button
              type="button"
              className={styles.danger}
              disabled={!writable || busy}
              onClick={() => void onDelete(ev.id)}
            >
              {t('delete')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
