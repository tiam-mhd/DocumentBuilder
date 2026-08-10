# Pre-GA performance & security hardening (P04-T11)

Short checklist before GA. See ADR 033 and `.cursor/rules/26-performance-security-hardening.mdc`.

## HTTP / surface

| Check | Status | Notes |
| --- | --- | --- |
| CORS allowlist only (`CORS_ORIGINS`), credentials on, no `*` | Pass | `apps/api/src/main.ts` |
| Helmet enabled | Pass | `helmet` in bootstrap; CSP off for JSON/Swagger |
| Optional `TRUST_PROXY` | Pass | Env + Express `trust proxy` when true |
| Global validation pipe (whitelist) | Pass | Existing |
| Exception filter `{ code, message }` | Pass | Existing |

## Auth / abuse

| Check | Status | Notes |
| --- | --- | --- |
| OTP rate-limit + cooldown (Redis) | Pass | Existing identity module |
| JWT + membership on business routes | Pass | Path `:businessId` |
| Share-link unlock rate limits | Pass | Existing |
| PDF enqueue Redis rate limit | Pass | `EXPORT_RATE_MAX` / `EXPORT_RATE_WINDOW_SECONDS` → `EXPORT_RATE_LIMITED` |
| PDF concurrent cap per Business | Pass | `queued`+`processing` ≤ `EXPORT_MAX_CONCURRENT_PER_BUSINESS` → `EXPORT_TOO_MANY_CONCURRENT` |
| Worker concurrency env | Pass | `EXPORT_WORKER_CONCURRENCY` (default 1) |

## Uploads / IDOR

| Check | Status | Notes |
| --- | --- | --- |
| Media MIME allowlist + size | Pass | `media.service` |
| Font formats woff2/ttf/otf only | Pass | Rule 11 |
| Storage keys scoped by `businessId` | Pass | Media/fonts/exports |
| Mongo always filtered by `businessId` | Pass | Documents/templates |
| Export file download membership-scoped | Pass | `GET .../exports/:jobId/file` |

## Data / performance

| Check | Status | Notes |
| --- | --- | --- |
| Tenant tables indexed on `businessId` (+ list sort columns) | Pass | `export_jobs (businessId, status, createdAt)` supports concurrent count |
| List APIs paginated | Pass | Coding standards |
| Export module entitlement N+1 reduced | Pass | Single `getForBusiness` + code set check |
| Platform-admin subscription list filters deleted businesses in SQL | Pass | `business: { deletedAt: null }` |

## Export cost / load

| Check | Status | Notes |
| --- | --- | --- |
| PDF never on editor keystroke | Pass | Queue only via `POST .../export/pdf` |
| Unit: rate limit + concurrent cap | Pass | `apps/api/test/export-hardening.spec.ts` |
| Light queue smoke script | Pass | `node scripts/load/export-queue-smoke.mjs` (optional live API) |

## Env knobs (operators)

```text
CORS_ORIGINS=https://app.example.com
TRUST_PROXY=true   # behind nginx / load balancer
EXPORT_MAX_CONCURRENT_PER_BUSINESS=2
EXPORT_RATE_MAX=10
EXPORT_RATE_WINDOW_SECONDS=60
EXPORT_WORKER_CONCURRENCY=1
```

## Residual / follow-ups (not blockers for this task)

- Full k6/locust soak of PDF workers under production Chromium — ops runbook, not CI gate.
- CDN / edge WAF in front of SAAS — infrastructure, not app code.
- Optional composite indexes on rarely scanned admin tables if slow-query logs appear.

## Sign-off

- Date: 2026-08-10
- Prompt: `implementation-prompts/04-phase-product/11-performance-hardening.md`
- Verdict: **Ready for GA checklist (P04-T12)** from an app hardening perspective.
