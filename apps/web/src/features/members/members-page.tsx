'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  InvitationStatus,
  MembershipRole,
  type PublicBusinessInvitation,
  type PublicBusinessMember,
} from '@vdb/shared-types';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import {
  createInvitation,
  listInvitations,
  listMembers,
  removeMember,
  revokeInvitation,
  updateMemberRole,
} from '@/shared/api/members';
import { useAuth } from '@/shared/lib/auth-context';
import { useBusinesses } from '@/shared/lib/business-context';
import { useMembershipPermissions } from '@/shared/lib/use-membership-permissions';
import styles from './members-page.module.css';

const INVITE_ROLES = [
  MembershipRole.Admin,
  MembershipRole.Editor,
  MembershipRole.Viewer,
] as const;

export function MembersPage() {
  const t = useTranslations('members');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const { user } = useAuth();
  const { activeBusiness } = useBusinesses();
  const { canManageMembers } = useMembershipPermissions();
  const businessId = activeBusiness?.id;
  const canManage = canManageMembers;

  const [members, setMembers] = useState<PublicBusinessMember[]>([]);
  const [invitations, setInvitations] = useState<PublicBusinessInvitation[]>(
    [],
  );
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState<string>(MembershipRole.Editor);
  const [error, setError] = useState<string | null>(null);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const inviteRoleOptions = useMemo(() => {
    if (activeBusiness?.role === MembershipRole.Owner) {
      return INVITE_ROLES;
    }
    return INVITE_ROLES.filter((r) => r !== MembershipRole.Admin);
  }, [activeBusiness?.role]);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      const membersRes = await listMembers(businessId);
      setMembers(membersRes);
      if (canManage) {
        const invRes = await listInvitations(businessId);
        setInvitations(invRes);
      } else {
        setInvitations([]);
      }
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setLoading(false);
    }
  }, [businessId, canManage, tErrors]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onInvite(event: FormEvent) {
    event.preventDefault();
    if (!businessId || !canManage) return;
    setBusy(true);
    setError(null);
    setLastInviteLink(null);
    try {
      const res = await createInvitation(businessId, { mobile, role });
      const token = res.token;
      if (token) {
        const origin =
          typeof window !== 'undefined' ? window.location.origin : '';
        setLastInviteLink(`${origin}/${locale}/invite/${token}`);
      }
      setMobile('');
      await load();
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setBusy(false);
    }
  }

  async function onChangeRole(userId: string, nextRole: string) {
    if (!businessId || !canManage) return;
    setBusy(true);
    setError(null);
    try {
      await updateMemberRole(businessId, userId, nextRole);
      await load();
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(userId: string, memberMobile: string) {
    if (!businessId || !canManage) return;
    if (!window.confirm(t('removeConfirm', { mobile: memberMobile }))) return;
    setBusy(true);
    setError(null);
    try {
      await removeMember(businessId, userId);
      await load();
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
      setError(mapApiErrorCode(code, tErrors));
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke(invitationId: string) {
    if (!businessId || !canManage) return;
    setBusy(true);
    setError(null);
    try {
      await revokeInvitation(businessId, invitationId);
      await load();
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

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.hint}>{t('hint')}</p>

      {error ? <p className={styles.error}>{error}</p> : null}

      {canManage ? (
        <form className={styles.inviteForm} onSubmit={(e) => void onInvite(e)}>
          <label className={styles.field}>
            {t('mobileLabel')}
            <input
              className={styles.input}
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder={t('mobilePlaceholder')}
              required
            />
          </label>
          <label className={styles.field}>
            {t('roleLabel')}
            <select
              className={styles.input}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {inviteRoleOptions.map((r) => (
                <option key={r} value={r}>
                  {t(`roles.${r}`)}
                </option>
              ))}
            </select>
          </label>
          <button className={styles.primary} type="submit" disabled={busy}>
            {t('invite')}
          </button>
        </form>
      ) : (
        <p className={styles.hint}>{t('readOnlyHint')}</p>
      )}

      {lastInviteLink ? (
        <div className={styles.inviteResult}>
          <p className={styles.hint}>{t('inviteLinkHint')}</p>
          <code className={styles.linkBox}>{lastInviteLink}</code>
        </div>
      ) : null}

      <h2 className={styles.h2}>{t('membersTitle')}</h2>
      {loading ? (
        <p className={styles.hint}>{t('loading')}</p>
      ) : (
        <ul className={styles.list}>
          {members.map((m) => {
            const isSelf = m.userId === user?.id;
            const isOwner = m.role === MembershipRole.Owner;
            return (
              <li key={m.userId} className={styles.item}>
                <div>
                  <strong>{m.mobile}</strong>
                  {isSelf ? (
                    <span className={styles.badge}>{t('you')}</span>
                  ) : null}
                  <p className={styles.meta}>{t(`roles.${m.role}`)}</p>
                </div>
                {canManage && !isOwner ? (
                  <div className={styles.actions}>
                    <select
                      className={styles.input}
                      value={m.role}
                      disabled={busy}
                      onChange={(e) =>
                        void onChangeRole(m.userId, e.target.value)
                      }
                    >
                      {inviteRoleOptions
                        .filter((r) => {
                          if (activeBusiness?.role === MembershipRole.Admin) {
                            return r !== MembershipRole.Admin;
                          }
                          return true;
                        })
                        .map((r) => (
                          <option key={r} value={r}>
                            {t(`roles.${r}`)}
                          </option>
                        ))}
                    </select>
                    {!isSelf ? (
                      <button
                        type="button"
                        className={styles.secondary}
                        disabled={busy}
                        onClick={() => void onRemove(m.userId, m.mobile)}
                      >
                        {t('remove')}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {canManage ? (
        <>
          <h2 className={styles.h2}>{t('invitationsTitle')}</h2>
          {invitations.length === 0 ? (
            <p className={styles.hint}>{t('invitationsEmpty')}</p>
          ) : (
            <ul className={styles.list}>
              {invitations.map((inv) => (
                <li key={inv.id} className={styles.item}>
                  <div>
                    <strong>{inv.mobile}</strong>
                    <p className={styles.meta}>
                      {t(`roles.${inv.role}`)} · {t(`status.${inv.status}`)}
                    </p>
                  </div>
                  {inv.status === InvitationStatus.Pending ? (
                    <button
                      type="button"
                      className={styles.secondary}
                      disabled={busy}
                      onClick={() => void onRevoke(inv.id)}
                    >
                      {t('revoke')}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  );
}
