# API documentation

## Source of truth

Canonical contract: [`openapi.yaml`](./openapi.yaml).

Nest Swagger UI at `/api/docs` is a **mirror** for local exploration — every route add/change/delete must update `openapi.yaml` in the same change (see `.cursor/rules/05-api-security-billing.mdc`).

## Conventions

### Envelope

Success:

```json
{ "data": {}, "meta": {} }
```

Errors:

```json
{
  "errors": [{ "code": "MACHINE_CODE", "message": "Human-readable fallback" }]
}
```

Clients map `code` → i18n (`fa` / `en`).

### Auth

- Mobile OTP → Bearer access JWT
- Protected: `Authorization: Bearer <accessToken>`

### Business context (locked)

- Scoped routes: `/api/businesses/:businessId/...`
- Membership required (IDOR → `BUSINESS_NOT_FOUND`)
- Web active business: cookie `vdb-business-id`

### Subscription

- One `subscriptions` row per Business (`business_id` unique)
- Statuses: `trial` | `active` | `grace` | `expired` | `pending_payment`
- Writable for EntitlementGuard prep: `trial` | `active` | `grace`
- `effectiveStatus`: trial/active/grace with past `endsAt` → `expired` (read-time)
- **Trial (atomic on Business create):**
  - `UPDATE users SET trial_consumed=true WHERE id=? AND trial_consumed=false`
  - if claimed → `status=trial`, `ends_at=now+7d`
  - else → `status=pending_payment`
  - Same PostgreSQL transaction as Business + OWNER membership

### Error codes (billing / entitlements)

| Code | Meaning |
| --- | --- |
| `SUBSCRIPTION_NOT_FOUND` | No subscription row |
| `SUBSCRIPTION_NOT_WRITABLE` | Not in writable set (HTTP 402) |
| `ENTITLEMENT_DENIED` | Missing non-module capability (HTTP 403) |
| `ENTITLEMENT_MODULE_REQUIRED` | Missing `module.*` (HTTP 403) |
| `LICENSE_REQUIRED` | SELF_HOSTED without active install license (HTTP 402) |
| `LICENSE_INVALID` | Bad license key |
| `LICENSE_NOT_APPLICABLE` | Activate called on SAAS |
| `LICENSE_ALREADY_ACTIVE` | Install already licensed |
| `LICENSE_EXPIRED` | License past `expires_at` |
| `MEDIA_NOT_FOUND` | Asset missing / wrong business |
| `MEDIA_INVALID_TYPE` | MIME not allowlisted |
| `MEDIA_TOO_LARGE` | Over `MEDIA_MAX_BYTES` |
| `MEDIA_SVG_FORBIDDEN` | SVG blocked |
| `MEDIA_UPLOAD_FAILED` | Storage/derivative failure |
| `MEDIA_STORAGE_ERROR` | Object missing from store |
| `FONT_NOT_FOUND` | Font face missing / wrong business |
| `FONT_INVALID_TYPE` | Not woff2/ttf/otf |
| `FONT_TOO_LARGE` | Over `FONT_MAX_BYTES` |
| `FONT_DUPLICATE` | Same family/weight/style active |
| `FONT_INVALID_FAMILY` | Bad family string |
| `FONT_INVALID_WEIGHT` | Weight not 100–900 step 100 |
| `THEME_NOT_FOUND` | Design theme missing / wrong business |
| `THEME_INVALID_TOKENS` | Token JSON failed validation |
| `THEME_INVALID_NAME` | Theme name empty / too long |
| `THEME_FONT_NOT_FOUND` | font_faces id not in business |
| `THEME_CANNOT_DELETE_DEFAULT` | Must set another default first |
| `TEMPLATE_NOT_FOUND` | Template missing / wrong business |
| `TEMPLATE_INVALID_NAME` | Name empty / too long |
| `TEMPLATE_INVALID_BODY` | Body failed document-schema validation |
| `TEMPLATE_THEME_NOT_FOUND` | themeId not in business |
| `TEMPLATE_STORAGE_ERROR` | Mongo write failed |
| `DOCUMENT_NOT_FOUND` | Document missing / wrong business |
| `DOCUMENT_INVALID_TITLE` | Title empty / too long |
| `DOCUMENT_INVALID_BODY` | Body failed document-schema validation |
| `DOCUMENT_INVALID_STATUS` | Not draft/published |
| `DOCUMENT_TEMPLATE_REQUIRED` | Create without templateId |
| `DOCUMENT_TEMPLATE_NOT_FOUND` | templateId not in business |
| `DOCUMENT_STORAGE_ERROR` | Mongo write failed |

### Current endpoints

| Method | Path | Auth |
| --- | --- | --- |
| `GET` | `/api/health` | none |
| `GET` | `/api/system/config` | none |
| `POST` | `/api/auth/otp/request` | none |
| `POST` | `/api/auth/otp/verify` | none → access token |
| `GET` | `/api/auth/me` | Bearer |
| `POST` | `/api/auth/logout` | Bearer |
| `GET/POST` | `/api/businesses` | Bearer |
| `GET/PATCH/DELETE` | `/api/businesses/:businessId` | Bearer + membership |
| `GET` | `/api/businesses/:businessId/subscription` | Bearer + membership |
| `GET` | `/api/businesses/:businessId/entitlements` | Bearer + membership |
| `POST` | `/api/businesses/:businessId/gates/writable` | Bearer + EntitlementGuard (writable) |
| `POST` | `/api/businesses/:businessId/gates/export-pdf` | Bearer + `export.pdf` |
| `POST` | `/api/businesses/:businessId/gates/module-map` | Bearer + `module.map` |
| `GET` | `/api/billing/catalog` | Bearer |
| `POST` | `/api/businesses/:businessId/billing/checkout` | Bearer + membership (SAAS only) |
| `GET` | `/api/billing/payments/callback` | Gateway return (no JWT) |
| `POST` | `/api/billing/webhooks/payment` | Idempotent webhook (no JWT) |
| `POST` | `/api/billing/payments/confirm` | Bearer + membership |
| `GET` | `/api/system/license` | none (status only) |
| `POST` | `/api/system/license/activate` | Bearer (SELF_HOSTED) |
| `GET` | `/api/businesses/:businessId/media` | Bearer + membership |
| `POST` | `/api/businesses/:businessId/media/upload` | Bearer + EntitlementGuard writable |
| `GET` | `/api/businesses/:businessId/media/:assetId` | Bearer + membership |
| `GET` | `/api/businesses/:businessId/media/:assetId/file` | Bearer + membership |
| `DELETE` | `/api/businesses/:businessId/media/:assetId` | Bearer + EntitlementGuard writable |
| `GET` | `/api/businesses/:businessId/fonts` | Bearer + membership |
| `POST` | `/api/businesses/:businessId/fonts/upload` | Bearer + EntitlementGuard writable |
| `GET` | `/api/businesses/:businessId/fonts/:fontId` | Bearer + membership |
| `GET` | `/api/businesses/:businessId/fonts/:fontId/file` | Bearer + membership |
| `DELETE` | `/api/businesses/:businessId/fonts/:fontId` | Bearer + EntitlementGuard writable |
| `GET` | `/api/businesses/:businessId/themes` | Bearer + membership |
| `GET` | `/api/businesses/:businessId/themes/default` | Bearer + membership |
| `POST` | `/api/businesses/:businessId/themes` | Bearer + EntitlementGuard writable |
| `GET` | `/api/businesses/:businessId/themes/:themeId` | Bearer + membership |
| `PATCH` | `/api/businesses/:businessId/themes/:themeId` | Bearer + EntitlementGuard writable |
| `POST` | `/api/businesses/:businessId/themes/:themeId/default` | Bearer + EntitlementGuard writable |
| `DELETE` | `/api/businesses/:businessId/themes/:themeId` | Bearer + EntitlementGuard writable |
| `GET` | `/api/businesses/:businessId/blocks` | Bearer + membership |
| `GET` | `/api/businesses/:businessId/templates` | Bearer + membership |
| `POST` | `/api/businesses/:businessId/templates` | Bearer + EntitlementGuard writable |
| `GET` | `/api/businesses/:businessId/templates/:templateId` | Bearer + membership |
| `PATCH` | `/api/businesses/:businessId/templates/:templateId` | Bearer + EntitlementGuard writable |
| `DELETE` | `/api/businesses/:businessId/templates/:templateId` | Bearer + EntitlementGuard writable |
| `GET` | `/api/businesses/:businessId/documents` | Bearer + membership |
| `POST` | `/api/businesses/:businessId/documents` | Bearer + EntitlementGuard writable |
| `GET` | `/api/businesses/:businessId/documents/:documentId` | Bearer + membership |
| `PATCH` | `/api/businesses/:businessId/documents/:documentId` | Bearer + EntitlementGuard writable |
| `DELETE` | `/api/businesses/:businessId/documents/:documentId` | Bearer + EntitlementGuard writable |
| `POST` | `/api/businesses/:businessId/documents/:documentId/export/pdf` | Bearer + `@RequireEntitlement(export.pdf)` |
| `GET` | `/api/businesses/:businessId/documents/:documentId/exports` | Bearer + membership |
| `GET` | `/api/businesses/:businessId/exports/:jobId` | Bearer + membership |
| `GET` | `/api/businesses/:businessId/exports/:jobId/file` | Bearer + membership (PDF bytes) |

### Entitlements

- Resolved from Plan `baseEntitlements` + `subscription_modules`
- Writable when effective status ∈ `trial|active|grace`
- Nest: `EntitlementsService.assertCan|assertModule|assertBusinessWritable` + `EntitlementGuard` + `@RequireWritable` / `@RequireEntitlement` / `@RequireModule`
- Gate probe routes under `/gates/*` prove wiring for modules
- UI: `GET .../entitlements` → disable CTA (never trust UI alone)
- **SELF_HOSTED:** EntitlementGuard also requires active `installation_licenses` (`LICENSE_REQUIRED`)

### Installation license (SELF_HOSTED)

- Table: `installation_licenses` (hashed key only)
- SAAS: activate → `LICENSE_NOT_APPLICABLE`; status `required: false`
- UI: `/app/license` when `licenseActivation: true`

### Media library

- Table: `media_assets` (`business_id` indexed; soft-delete)
- Storage: `STORAGE_DRIVER=local|s3` (local disk or MinIO/S3)
- Upload MIME allowlist: jpeg/png/webp/gif — **SVG forbidden**
- Derivatives via Sharp: thumb / web / print (sync on upload)
- Mutate routes use `EntitlementGuard` + `@RequireWritable`
- Endpoints under `/api/businesses/:businessId/media`

### Fonts

- Table: `font_faces` (`family`, `weight`, `style`, `storage_key`)
- Formats: **woff2 / ttf / otf** only (`.cursor/rules/11-fonts.mdc`)
- Storage key: `{businessId}/fonts/{fontId}/original.{ext}` — PDF worker uses ObjectStorage (see `docs/adr/001-font-storage-pdf-embed.md`)
- Endpoints under `/api/businesses/:businessId/fonts`

### Design themes (document brand)

- Table: `design_themes` (`tokens` JSONB; `is_default`)
- **Not** app chrome dark/light — see `.cursor/rules/12-design-themes.mdc` + `docs/adr/002-design-theme-tokens.md`
- Default theme seeded on Business create; `GET .../themes/default` also ensures one exists
- Optional `fonts.*FontFaceId` → `font_faces` same Business
- Mutate routes use `EntitlementGuard` + `@RequireWritable`
- Endpoints under `/api/businesses/:businessId/themes`

### Templates & core blocks

- PG `document_templates` + Mongo `template_bodies` (`businessId` + `templateId`) — see `docs/adr/003-template-mongo-body.md`
- Schema v3: masters + `pages[].masterId`; core blocks `text` | `image` | `section` | `divider` | `headerSlot` | `footerSlot`
- Registry: `GET /api/businesses/:businessId/blocks`
- Layout only — no Business data in templates
- Mutate routes use `EntitlementGuard` + `@RequireWritable`
- Master render contract: see `docs/adr/006-master-pages.md` (header → body → footer → page number)

### Documents

- PG `documents` (`title`, `status` draft|published, `template_id`) + Mongo `document_bodies`
- Create copies template block snapshot; `dataRefs` for Business Data (empty at create)
- Soft-delete PG + remove Mongo body — see `docs/adr/004-document-crud.md`
- Validate body with `@vdb/document-schema` v3 (`masters` + `pages`)
- Mutate routes use `EntitlementGuard` + `@RequireWritable`
- **Editor (web):** flow shell at `/app/documents/:documentId` — Zustand undo/redo, dnd-kit vertical reorder, HTML preview with master header/footer/page numbers, autosave debounce **800ms** via PATCH (never PDF on keystroke). See `docs/adr/005-editor-shell-autosave.md` + `docs/adr/006-master-pages.md`

### PDF export

- PG `export_jobs` (`queued` → `processing` → `completed`|`failed`) + Redis/BullMQ queue `export.pdf`
- Canonical HTML from document body + design theme + `@font-face` embeds (ObjectStorage fonts)
- `PDF_RENDERER=fake|playwright` — fake for CI/dev; Playwright Chromium for production workers
- Storage key: `{businessId}/exports/{jobId}/document.pdf`
- Gate: `POST .../export/pdf` requires `export.pdf` (UI mirrors via entitlements)
- See `docs/adr/007-pdf-export-pipeline.md` + `docs/deploy/README.md` (worker)

### Catalog

- Seed: `plan.core` (base entitlement `export.pdf`) + modules `module.map|org_chart|timeline|projects`
- Run: `npm run db:seed` after migrate

### Payments (SAAS)

- Tables: `invoices`, `payments` (`gateway_ref` unique; append-only)
- Drivers: `PAYMENT_PROVIDER=fake|zarinpal` via `PaymentPort`
- Success → subscription `active`, `ends_at = now+30d`, attach selected modules
- Idempotency: unique `gateway_ref` + Redis `payment:webhook:{ref}` lock + optional `Idempotency-Key` on checkout
- `SELF_HOSTED`: checkout returns `BILLING_CHECKOUT_UNAVAILABLE` (license path)

### Phase 01 SAAS acceptance

- Runnable: `npm run test:e2e:saas` (`scripts/e2e/saas-funnel.mjs`)
- Checklist: `docs/qa/phase-01-saas-acceptance.md`

### Phase 01 SELF_HOSTED acceptance

- Runnable: `npm run test:e2e:self-hosted` (`scripts/e2e/self-hosted-funnel.mjs`)
- Checklist: `docs/qa/phase-01-self-hosted-acceptance.md`
- Asserts `LICENSE_REQUIRED` before activate, then document→PDF; blocks SAAS checkout
