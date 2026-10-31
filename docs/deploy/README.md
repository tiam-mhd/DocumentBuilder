# Deploy — Docker / VPS

Primary target for both editions: **Docker on a VPS** running NestJS + Next.js + PostgreSQL + Redis + MongoDB.

Shared cPanel / PHP hosting is **not** the primary path.

## Runflare (SAAS)

The Runflare bundle is in the repository root `Dockerfile`. It serves Next.js and NestJS through one Nginx entrypoint on port `8080`; the application processes stay private on ports `3002` and `3001`. This keeps the web app and API in one Runflare deployment.

### Minimum Runflare resources

Create one Runflare project and four deployments in the same project/cluster:

1. One Docker service for this repository (Next.js + NestJS + Nginx + the in-process PDF worker).
2. One PostgreSQL database.
3. One Redis database.
4. One MongoDB database.

The app requires all three databases, so fewer than four deployments means dropping a required dependency. The attached object-storage disk is a persistent disk on the Docker service, not an extra application deployment. Runflare counts both services and databases as project deployments; its current free plan lists two deployments, so select a plan with at least four. Runflare's project and database setup guides explain this deployment/resource model and its available database types: [getting started](https://runflare.com/docs/get-started/), [create project](https://runflare.com/docs/create-project/), [PostgreSQL](https://runflare.com/docs/postgres/), [MongoDB](https://runflare.com/docs/mongo/), and [Runflare database types](https://runflare.com/).

Keep the Docker service and databases in the same project. Use the **internal service hostnames and credentials shown in Runflare**, not public/remote endpoints. PostgreSQL's internal port is `5432`; MongoDB's is `27017`. Use the Redis connection URL shown for that Redis deployment. Runflare's internal Postgres and Mongo connection examples are in its [database guides](https://runflare.com/docs/postgres/) and [MongoDB guide](https://runflare.com/docs/mongo/).

### Prepare configuration

1. Create the Docker deployment from this repository and the root `Dockerfile` (or deploy it with Runflare CLI from the repo root). The image listens on container port `8080`; route public HTTP traffic to that port. If the Runflare network form asks for both ports, expose HTTP port `80` to target port `8080` using a public/NodePort entry. Runflare distinguishes public NodePort traffic from project-internal ClusterIP traffic in its [network guide](https://runflare.com/docs/network/).
2. Create PostgreSQL, Redis, and MongoDB. Copy their internal hosts, users, and passwords into the environment file below. URL-encode any reserved characters in database usernames/passwords before inserting them into a URI.
3. Add a persistent disk to the Docker service mounted at exactly `/var/lib/vdb/object-storage`. Files uploaded by users and generated export artifacts use this location. Keep the Docker service at one replica while using local disk storage; multiple app replicas need shared object storage (S3-compatible) instead. Runflare documents that disk-mounted files remain when the service restarts: [persistent service disk](https://runflare.com/docs/add-disk-to-service/).
4. Generate a local configuration file:

   ```powershell
   npm run deploy:runflare:env
   ```

   This creates a Git-ignored `.env.runflare` and generates unique 32-byte values for `OTP_PEPPER`, `JWT_SECRET`, and `LICENSE_PEPPER`. It never overwrites an existing file. Replace the required `__FILL_*__` values with values from your Runflare project and accounts. `PLATFORM_ADMIN_MOBILES` is optional; clear it if you do not need the SAAS admin console. The domain must be the final HTTPS hostname attached to the Docker service.
5. Add those variables to the Docker service's runtime environment with Runflare bulk edit. Mark the database URLs, peppers, Parsgreen token, and other credentials as **Secret**. Do not put a real SMS token or merchant credential in Git. Runflare restarts a service after environment changes; its guide describes bulk edit and Secret mode: [environment variables](https://runflare.com/docs/setup-environment-variable/).

`NEXT_PUBLIC_API_URL=/api` is baked into the Next.js build in the Dockerfile, and Nginx sends `/api/*` to NestJS. The app therefore uses one public HTTPS domain and needs no separate API service/domain. If this API path or public hostname changes, rebuild/redeploy the Docker image and update `CORS_ORIGINS`, `WEB_ORIGIN`, and `API_PUBLIC_URL` together.

### Required values to supply

The generated `.env.runflare` already contains production mode, SAAS edition, safe runtime defaults, storage path, PDF renderer, and generated secrets. The remaining placeholders come from your accounts or from services Runflare creates:

| Variable | Value to supply |
| --- | --- |
| `CORS_ORIGINS`, `WEB_ORIGIN`, `API_PUBLIC_URL` | Same assigned HTTPS domain; the API URL ends in `/api`. |
| `DATABASE_URL` | Runflare PostgreSQL host/password and database `vdb`. |
| `REDIS_URL` | Full connection URL shown by the Redis deployment. |
| `MONGODB_URI` | Runflare MongoDB host/user/password; keep `vdb` as the app database and `authSource=admin` if its user is created in `admin`. |
| `PARSGREEN_API_TOKEN` | API token from your Parsgreen account. OTP sign-in will not work until this is set. |
| `ZARINPAL_MERCHANT_ID` | Production merchant ID. Fake payments are not enabled for this SAAS deployment. |
| `PLATFORM_ADMIN_MOBILES` | Your own Iranian mobile in normalized E.164 form (`+98...`) if you need the SAAS platform-admin console. Leave empty if you only need a Business OWNER account. |

The Parsgreen token, Zarinpal merchant ID, domain, and Runflare database credentials cannot be inferred from the repository. `PAYMENT_PROVIDER=zarinpal` and `ZARINPAL_SANDBOX=false` are intentional: a fake payment adapter would bypass the production billing flow. `LICENSE_ISSUER_SECRET` and S3 credentials are not required for this `SAAS` + local persistent disk setup.

### Deploy and initialize

Install and authenticate the [Runflare CLI](https://runflare.com/docs/get-started/), then deploy from this repository root and select the project and Docker service. The CLI deploys the project root and observes `.gitignore`; see [CLI deploy](https://runflare.com/docs/work-with-cli/cli-deploy/) and [Docker hosting](https://runflare.com/%D9%87%D8%A7%D8%B3%D8%AA-%D8%A7%D8%A8%D8%B1%DB%8C-docker/):

```powershell
runflare login
runflare deploy
```

Attach the HTTPS domain to the Docker service using Runflare's [domain instructions](https://runflare.com/docs/how-to-add-domain/) and [service domain mapping](https://runflare.com/docs/add-domain-to-service/). Set `CORS_ORIGINS` to the origin only (no path or trailing slash), `WEB_ORIGIN` to the same origin, and `API_PUBLIC_URL` to that origin plus `/api`.

After the Docker service and databases are running, use its Runflare terminal to apply migrations and seed the plan/catalog:

```bash
cd /app
npm run prisma:deploy -w @vdb/api
npm run db:seed
```

Then visit the public domain, enter your mobile number, request the OTP, and complete verification. This creates the first user; the user owns their password and can set one in **Profile → Security** after signing in. There is deliberately no fixed/default mobile/password to publish. Login is mobile-first with OTP and optional password as defined by the current auth rules.

For the SAAS platform-admin console, set `PLATFORM_ADMIN_MOBILES` to that same mobile in `+98...` form and run `npm run db:seed` again after the OTP signup; the seed only grants the role to a user row that already exists. Then sign out/in or refresh. A normal first user can still create a Business and become its OWNER without platform-admin access.

Check `https://<your-domain>/api/health`; the Docker image healthcheck requires PostgreSQL, Redis, and MongoDB all to report `up`. Review service logs after the initial deployment. For local files, database backups, and platform-level disaster recovery, keep an independent backup plan; tenant ZIP backups do not include Redis or replace database backups.

### Runflare health and redirect troubleshooting

- `https://<your-domain>/healthz` checks that public traffic reaches the container Nginx listener on port `8080`; it does not depend on database health.
- `https://<your-domain>/api/health` checks PostgreSQL, Redis, and MongoDB. `degraded` means the API route is reachable but at least one dependency is unavailable. PostgreSQL health runs `SELECT 1`, so a failed check is a connection, credential, or database-access issue; rerunning migrations does not fix it.
- In Prisma 6, `schema=public` selects PostgreSQL's default schema. Adding or removing that query parameter does not change host, port, or credential connectivity.
- PostgreSQL health responses intentionally omit exception details. API logs show the non-secret target (`host:port/database`) and a sanitized error class/code; they never print the connection URL or credentials. Match the hostname to the local address shown in the Runflare database details (the [Postgres guide](https://runflare.com/docs/postgres/) uses `psql-esf-service` as an example); the local port may be omitted or set to `5432`.
- If the browser is redirected to an internal URL such as `localhost:3002`, confirm the public domain targets this Docker service on container port `8080` and rebuild from the current repository revision. Middleware locale/auth redirects must use an absolute URL rebuilt from the public host and protocol forwarded by Nginx; Next.js middleware rejects relative redirect URLs.
- For PostgreSQL `down`, compare the Docker service's runtime `DATABASE_URL` with the exact PostgreSQL internal hostname, port, database, username, and password shown by Runflare. Keep both services in the same project and URL-encode reserved characters in the username/password.

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

## Custom domain (white-label)

White-label stores a **hostname only** on `business_branding.custom_domain` (API validates uniqueness). TLS and reverse-proxy are operational:

1. Create a DNS **CNAME** (or A/AAAA) for `docs.customer.com` → your VPS / load balancer.
2. Terminate TLS at the proxy (Let’s Encrypt / Cloudflare).
3. Route `Host: docs.customer.com` to the **web** (Next) and keep Nest on the API origin; or terminate at a gateway that sets the public host.
4. Resolve brand for publish: `GET /api/branding/resolve?host=docs.customer.com` (public).

`SELF_HOSTED` installs always may set custom domains. On **SAAS**, the Business needs entitlement `branding.white_label`.

See also: `.cursor/rules/18-white-label-branding.mdc`.

## Analytics opt-out

Product view/download metrics enqueue to Redis (`analytics.ingest`) and land in PostgreSQL `analytics_events`. No raw IP/UA is stored.

```bash
ANALYTICS_ENABLED=true   # set false to disable ingest install-wide
```

Dashboard: `/[locale]/app/analytics` (OWNER/ADMIN). See ADR 028 / `.cursor/rules/21-analytics.mdc`.

## SAAS platform admin

Cross-tenant operator console (ADR 031 / `.cursor/rules/24-saas-platform-admin.mdc`). **Not** Business OWNER/ADMIN.

```bash
APP_EDITION=SAAS
# After users exist, seed/boot upserts platform_admins for these mobiles:
PLATFORM_ADMIN_MOBILES=09121234567
# Optional: restrict /api/platform-admin/* by client IP (empty = allow all).
# Behind a reverse proxy, ensure X-Forwarded-For is trusted or terminate allowlist at the edge.
PLATFORM_ADMIN_IP_ALLOWLIST=
```

UI: `/[locale]/app/platform-admin` (hidden unless SAAS + `platform_admins` row). SELF_HOSTED returns 403 on admin routes.

## SAAS billing dunning / renewal

Daily BullMQ job `billing.dunning` (03:15 UTC) persists `grace` → `expired` and sends SMS to Business OWNERs (idempotent `subscription_dunning_notices`). Email is out of scope.

```bash
BILLING_GRACE_DAYS=3
```

Manual tick (platform admin): `POST /api/platform-admin/dunning/run` with optional `{ "nowIso": "..." }` for clock tests. See ADR 032 / `.cursor/rules/25-billing-dunning.mdc`.

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

Cost controls (ADR 033): set `EXPORT_MAX_CONCURRENT_PER_BUSINESS`, `EXPORT_RATE_*`, and `EXPORT_WORKER_CONCURRENCY`. Behind a reverse proxy set `TRUST_PROXY=true` and lock `CORS_ORIGINS`. Checklist: [pre-ga-hardening](../qa/pre-ga-hardening.md). GA catalog exit: [GA-checklist](../qa/GA-checklist.md).

See [ADR 007](../adr/007-pdf-export-pipeline.md) and [ADR 033](../adr/033-performance-security-hardening.md).

## Local data stores

```bash
npm run docker:up
```

Ports (see root `.env.example`):

- PostgreSQL `5432` (if busy, copy `docker-compose.override.example.yml` → `docker-compose.override.yml` for host `5434` and update `DATABASE_URL`)
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
