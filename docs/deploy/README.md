# Deploy — Docker / VPS

Primary target for both editions: **Docker on a VPS** running NestJS + Next.js + PostgreSQL + Redis + MongoDB.

Shared cPanel / PHP hosting is **not** the primary path.

## Editions

Set in environment:

```bash
APP_EDITION=SAAS          # or SELF_HOSTED
```

| Concern | `SAAS` | `SELF_HOSTED` |
| --- | --- | --- |
| Who hosts | You | Buyer |
| Signup | Public OTP (Phase 01) | Often invite-only |
| Billing adapter | Platform billing + PaymentPort | License gate |
| Branding | Platform / white-label | Customer brand |
| Checkout | `POST .../billing/checkout` (SAAS only) | Disabled (`platformCheckout: false`) |
| Install license | N/A (`licenseActive: true`) | Required (`installation_licenses`) |

Public flags are exposed at `GET /api/system/config` (no secrets).

### SAAS payment env

```bash
PAYMENT_PROVIDER=fake          # or zarinpal
ZARINPAL_MERCHANT_ID=          # required when zarinpal
ZARINPAL_SANDBOX=true
WEB_ORIGIN=http://localhost:3000
API_PUBLIC_URL=http://localhost:3001/api
```

Fake driver completes via `GET /api/billing/payments/callback` → redirect to `/app/billing/return`.

### SELF_HOSTED license (Docker / VPS)

```bash
APP_EDITION=SELF_HOSTED
LICENSE_PEPPER=change-me-min-16-chars
# Production: issue signed keys; leave empty only for local opaque VDB-… keys
LICENSE_ISSUER_SECRET=
```

1. Deploy Nest + Next + PG + Redis + Mongo on the buyer VPS (not shared cPanel/PHP).
2. Run migrations (`npm run migrate`).
3. Sign in as admin → `/[locale]/app/license` → activate key.
4. Until active, `EntitlementGuard` mutate/export probes return `LICENSE_REQUIRED`.
5. Raw license keys are hashed (`key_hash`); only `key_hint` is shown in UI.

Signed key format (when `LICENSE_ISSUER_SECRET` set):

`VDB1.<base64url(json)>.<base64url(hmac-sha256)>` with optional `{ "org", "exp" }`.

### Media object storage

```bash
STORAGE_DRIVER=local          # or s3
STORAGE_LOCAL_ROOT=./.data/object-storage
MEDIA_MAX_BYTES=10485760

# MinIO / S3 when STORAGE_DRIVER=s3
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=vdb
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio123
S3_FORCE_PATH_STYLE=true
```

Local disk is the default for Docker/VPS dev; point `STORAGE_DRIVER=s3` at MinIO for production-like object storage (not cPanel).

Font files share the same storage. PDF workers must read:

```text
{businessId}/fonts/{fontId}/original.{woff2|ttf|otf}
```

via ObjectStorage (see [ADR 001](../adr/001-font-storage-pdf-embed.md)). Set `FONT_MAX_BYTES` (default 5MB).

### PDF export worker (BullMQ)

Phase 01 runs the BullMQ **worker inside the Nest API process** (queue `export.pdf`). A dedicated worker container can be split later without changing job payload shape.

```bash
# Dev / CI without Chromium download
PDF_RENDERER=fake

# Production worker image (pre-bake Chromium — CDN geo blocks are common)
PDF_RENDERER=playwright
# In Dockerfile after npm ci:
#   npx playwright install --with-deps chromium
```

Export artifacts:

```text
{businessId}/exports/{jobId}/document.pdf
```

Redis must be reachable (`REDIS_URL`). Without Redis, enqueue fails with `EXPORT_QUEUE_UNAVAILABLE`.

See [ADR 007](../adr/007-pdf-export-pipeline.md).

## Local data stores

```bash
npm run docker:up
```

Ports (see root `.env.example`):

- PostgreSQL `5432`
- Redis `6379`
- MongoDB `27017`

## App processes

1. Configure `apps/api/.env` and `apps/web/.env.local` from their `.env.example` files.
2. `npm run prisma:generate` (and migrate when domain models exist).
3. `npm run db:seed` (plans/modules — required before export entitlement on trial).
4. `npm run api:dev` → `http://localhost:3001/api/health`
5. `npm run web:dev` → `http://localhost:3000/fa`

### Phase 01 acceptance (SAAS)

With API up (`APP_EDITION=SAAS`, fake SMS + payment + PDF):

```bash
npm run test:e2e:saas
```

Checklist: [docs/qa/phase-01-saas-acceptance.md](../qa/phase-01-saas-acceptance.md).

### Phase 01 acceptance (SELF_HOSTED)

Restart API with `APP_EDITION=SELF_HOSTED` (empty `LICENSE_ISSUER_SECRET` for local `VDB-…` keys). Prefer no active install license for the full deny→activate path:

```bash
npm run test:e2e:self-hosted
```

Checklist: [docs/qa/phase-01-self-hosted-acceptance.md](../qa/phase-01-self-hosted-acceptance.md).

Opaque dev key example: `VDB-DEV-LICENSE-KEY-0001` (or set `LICENSE_KEY`).

## Production sketch

Same artifacts for both editions; difference is env + domain + backup ownership:

- Reverse proxy (Caddy/Nginx) → Next (`3000`) + Nest (`3001`)
- Managed or containerized PostgreSQL, Redis, MongoDB
- Object storage (S3/MinIO) for media/fonts (Phase 01)
- Queue worker for BullMQ PDF jobs (in-process with API in Phase 01; optional dedicated worker later)
- Set `PDF_RENDERER=playwright` and bake Chromium into the API/worker image for real PDFs

### Business workspace backup (tenant ZIP)

Owners can export/restore one Business via in-app `/app/backup` (ADR 024). This is **not** a substitute for platform backups:

| Layer | Who | What |
| --- | --- | --- |
| Tenant ZIP | Business OWNER | PG content + Mongo bodies + media/font binaries for one `businessId` |
| Platform | Operator | PostgreSQL dumps, Mongo dumps, Redis (ephemeral), object-storage bucket replication |

Package: ZIP `kind=vdb.business-backup`, `formatVersion=1`. Storage keys: `{businessId}/backups/{jobId}/package.zip` and `{businessId}/restores/{jobId}/package.zip`. Env: `BACKUP_MAX_BYTES` (default 100MB). Queues: `backup.workspace`, `restore.workspace`.
