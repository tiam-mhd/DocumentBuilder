'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { PublicInvitationPreview } from '@vdb/shared-types';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { acceptInvitation, previewInvitation } from '@/shared/api/members';
import { useAuth } from '@/shared/lib/auth-context';
import { useBusinesses } from '@/shared/lib/business-context';
import styles from '../members/members-page.module.css';

export function InviteAcceptPage() {
  const t = useTranslations('members');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { refresh } = useBusinesses();

  const [preview, setPreview] = useState<PublicInvitationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await previewInvitation(token);
        if (!cancelled) setPreview(res);
      } catch (err) {
        const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
        if (!cancelled) setError(mapApiErrorCode(code, tErrors));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, tErrors]);

  async function onAccept() {
    setBusy(true);
    setError(null);
    try {
      await acceptInvitation(token);
      await refresh();
      router.push(`/${locale}/app`);
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('inviteTitle')}</h1>
      {error ? <p className={styles.error}>{error}</p> : null}
      {preview ? (
        <>
          <p className={styles.hint}>
            {t('invitePreview', {
              business: preview.businessName,
              role: t(`roles.${preview.role}`),
              mobile: preview.mobile,
            })}
          </p>
          {authLoading ? (
            <p className={styles.hint}>{t('loading')}</p>
          ) : !isAuthenticated ? (
            <p className={styles.hint}>
              {t('loginRequired')}{' '}
              <Link href={`/${locale}/login?next=/${locale}/invite/${token}`}>
                {t('loginCta')}
              </Link>
            </p>
          ) : user?.mobile !== preview.mobile ? (
            <p className={styles.error}>{t('mobileMismatch')}</p>
          ) : (
            <button
              type="button"
              className={styles.primary}
              disabled={busy || preview.status !== 'pending'}
              onClick={() => void onAccept()}
            >
              {t('accept')}
            </button>
          )}
        </>
      ) : !error ? (
        <p className={styles.hint}>{t('loading')}</p>
      ) : null}
    </section>
  );
}
