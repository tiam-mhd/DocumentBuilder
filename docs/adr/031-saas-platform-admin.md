# ADR 031 — SAAS Platform Admin Console

## Status

Accepted (P04-T09)

## Context

Platform operators need to inspect tenants, subscriptions, and failed jobs, and suspend abusive businesses. This must not conflate with per-Business OWNER/ADMIN roles, and must not exist on SELF_HOSTED installs.

## Decision

1. `platform_admins` table links Users to platform operator privilege.
2. All admin HTTP under `/api/platform-admin/*` — SAAS edition + platform_admin guard (+ optional IP allowlist).
3. Business suspension via `businesses.suspended_at` (and reason/by); entitlements treat suspended as not writable.
4. Audit actions `platform.business.suspend` / `platform.business.unsuspend`.
5. UI at `/app/platform-admin` only when edition is SAAS and `/platform-admin/me` is true.

## Consequences

- SELF_HOSTED builds remain clean (403 + no nav).
- Future richer admin (impersonation, refunds) needs a new ADR.
