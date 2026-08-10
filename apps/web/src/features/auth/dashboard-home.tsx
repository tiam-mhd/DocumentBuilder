'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type {
  PublicDocument,
  PublicSubscription,
} from '@vdb/shared-types';
import { useAuth } from '@/shared/lib/auth-context';
import { useBusinesses } from '@/shared/lib/business-context';
import { listDocuments } from '@/shared/api/documents';
import { fetchBusinessSubscription } from '@/shared/api/subscriptions';
import { fetchBusinessEntitlements } from '@/shared/api/entitlements';
import { LicenseBanner } from '@/features/settings/license-banner';
import { TrialBanner } from '@/features/billing/trial-banner';
import styles from './dashboard.module.css';

type QuickAction = {
  href: string;
  labelKey:
    | 'qaDocuments'
    | 'qaTemplates'
    | 'qaMedia'
    | 'qaTeam'
    | 'qaThemes'
    | 'qaBilling'
    | 'qaProfile'
    | 'qaBusinesses';
  hintKey:
    | 'qaDocumentsHint'
    | 'qaTemplatesHint'
    | 'qaMediaHint'
    | 'qaTeamHint'
    | 'qaThemesHint'
    | 'qaBillingHint'
    | 'qaProfileHint'
    | 'qaBusinessesHint';
};

const ACTIONS: QuickAction[] = [
  {
    href: '/app/documents',
    labelKey: 'qaDocuments',
    hintKey: 'qaDocumentsHint',
  },
  {
    href: '/app/templates',
    labelKey: 'qaTemplates',
    hintKey: 'qaTemplatesHint',
  },
  { href: '/app/media', labelKey: 'qaMedia', hintKey: 'qaMediaHint' },
  { href: '/app/team', labelKey: 'qaTeam', hintKey: 'qaTeamHint' },
  { href: '/app/themes', labelKey: 'qaThemes', hintKey: 'qaThemesHint' },
  { href: '/app/billing', labelKey: 'qaBilling', hintKey: 'qaBillingHint' },
];

function greetingPeriod(date = new Date()): 'morning' | 'afternoon' | 'evening' {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

export function DashboardHome() {
  const t = useTranslations('dashboard');
  const tSub = useTranslations('subscription');
  const locale = useLocale();
  const { user } = useAuth();
  const { activeBusiness, businesses, loading: businessLoading } =
    useBusinesses();

  const [subscription, setSubscription] = useState<PublicSubscription | null>(
    null,
  );
  const [docTotal, setDocTotal] = useState<number | null>(null);
  const [recentDocs, setRecentDocs] = useState<PublicDocument[]>([]);
  const [moduleCount, setModuleCount] = useState<number | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const displayName =
    user?.displayName?.trim() || user?.mobile || t('guestName');
  const period = greetingPeriod();

  useEffect(() => {
    if (!activeBusiness) {
      setSubscription(null);
      setDocTotal(null);
      setRecentDocs([]);
      setModuleCount(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoadingMeta(true);
      try {
        const [sub, docs, ents] = await Promise.all([
          fetchBusinessSubscription(activeBusiness.id),
          listDocuments(activeBusiness.id, { page: 1, pageSize: 5 }),
          fetchBusinessEntitlements(activeBusiness.id),
        ]);
        if (cancelled) return;
        setSubscription(sub);
        setDocTotal(docs.total);
        setRecentDocs(docs.items);
        setModuleCount(ents.modules.length);
      } catch {
        if (!cancelled) {
          setSubscription(null);
          setDocTotal(null);
          setRecentDocs([]);
          setModuleCount(null);
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBusiness]);

  const statusLabel = useMemo(() => {
    if (!subscription) return null;
    return tSub(`status.${subscription.effectiveStatus}`);
  }, [subscription, tSub]);

  const daysLeft =
    subscription?.daysUntilEnd != null && subscription.daysUntilEnd >= 0
      ? subscription.daysUntilEnd
      : null;

  return (
    <div className={styles.home}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>{t('workspaceLabel')}</p>
        <h1 className={styles.greeting}>
          {t(`greeting.${period}`, { name: displayName })}
        </h1>
        <p className={styles.lead}>{t('lead')}</p>
      </header>

      <LicenseBanner />
      {subscription ? <TrialBanner subscription={subscription} /> : null}

      {!businessLoading && businesses.length === 0 ? (
        <section className={styles.emptyCard}>
          <h2 className={styles.emptyTitle}>{t('emptyTitle')}</h2>
          <p className={styles.emptyBody}>{t('emptyBody')}</p>
          <Link className={styles.primaryCta} href={`/${locale}/app/businesses`}>
            {t('createBusinessCta')}
          </Link>
        </section>
      ) : (
        <>
          <section className={styles.statusStrip} aria-label={t('statusLabel')}>
            <div className={styles.statusItem}>
              <span className={styles.statusKey}>{t('activeBusiness')}</span>
              <span className={styles.statusVal}>
                {activeBusiness?.name ?? t('noBusiness')}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusKey}>{t('planStatus')}</span>
              <span
                className={styles.statusVal}
                data-tone={
                  subscription?.writable
                    ? 'ok'
                    : subscription
                      ? 'warn'
                      : 'muted'
                }
              >
                {loadingMeta
                  ? t('loading')
                  : statusLabel ?? t('statusUnknown')}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusKey}>{t('documents')}</span>
              <span className={styles.statusVal}>
                {loadingMeta
                  ? '…'
                  : docTotal != null
                    ? t('countValue', { count: docTotal })
                    : '—'}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusKey}>{t('modules')}</span>
              <span className={styles.statusVal}>
                {loadingMeta
                  ? '…'
                  : moduleCount != null
                    ? t('countValue', { count: moduleCount })
                    : '—'}
              </span>
            </div>
            {daysLeft != null ? (
              <div className={styles.statusItem}>
                <span className={styles.statusKey}>{t('daysLeft')}</span>
                <span className={styles.statusVal}>
                  {t('daysLeftValue', { days: daysLeft })}
                </span>
              </div>
            ) : null}
          </section>

          <section className={styles.block}>
            <div className={styles.blockHead}>
              <h2 className={styles.blockTitle}>{t('quickTitle')}</h2>
              <p className={styles.blockHint}>{t('quickHint')}</p>
            </div>
            <div className={styles.actions}>
              {ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  className={styles.action}
                  href={`/${locale}${action.href}`}
                >
                  <span className={styles.actionTitle}>
                    {t(action.labelKey)}
                  </span>
                  <span className={styles.actionHint}>
                    {t(action.hintKey)}
                  </span>
                </Link>
              ))}
              <Link
                className={styles.action}
                href={`/${locale}/app/profile`}
              >
                <span className={styles.actionTitle}>{t('qaProfile')}</span>
                <span className={styles.actionHint}>{t('qaProfileHint')}</span>
              </Link>
              <Link
                className={styles.action}
                href={`/${locale}/app/businesses`}
              >
                <span className={styles.actionTitle}>{t('qaBusinesses')}</span>
                <span className={styles.actionHint}>
                  {t('qaBusinessesHint', { count: businesses.length })}
                </span>
              </Link>
            </div>
          </section>

          <section className={styles.block}>
            <div className={styles.blockHead}>
              <h2 className={styles.blockTitle}>{t('recentTitle')}</h2>
              {activeBusiness ? (
                <Link
                  className={styles.blockLink}
                  href={`/${locale}/app/documents`}
                >
                  {t('seeAll')}
                </Link>
              ) : null}
            </div>

            {!activeBusiness ? (
              <p className={styles.muted}>{t('pickBusiness')}</p>
            ) : loadingMeta ? (
              <p className={styles.muted}>{t('loading')}</p>
            ) : recentDocs.length === 0 ? (
              <div className={styles.emptyDocs}>
                <p className={styles.muted}>{t('noDocuments')}</p>
                <Link
                  className={styles.textCta}
                  href={`/${locale}/app/documents`}
                >
                  {t('goDocuments')}
                </Link>
              </div>
            ) : (
              <ul className={styles.docList}>
                {recentDocs.map((doc) => (
                  <li key={doc.id}>
                    <Link
                      className={styles.docRow}
                      href={`/${locale}/app/documents/${doc.id}`}
                    >
                      <span className={styles.docTitle}>{doc.title}</span>
                      <span className={styles.docMeta}>
                        <span className={styles.docStatus}>{doc.status}</span>
                        <time dateTime={doc.updatedAt}>
                          {new Date(doc.updatedAt).toLocaleDateString(locale)}
                        </time>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
