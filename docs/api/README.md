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
- `effectiveStatus`: after `endsAt` → `grace` for `BILLING_GRACE_DAYS` (default 3), then `expired` (read-time + daily dunning job)
- Daily BullMQ `billing.dunning` (SAAS): persist grace/expired + idempotent SMS to OWNER mobiles
- Never delete tenant data on expiry; renew via existing checkout
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
| `GET/PATCH/DELETE` | `/api/businesses/:businessId` | Bearer + membership (PATCH ADMIN+; DELETE OWNER) |
| `GET` | `/api/businesses/:businessId/permissions` | Bearer + membership (role RBAC codes) |
| `GET` | `/api/businesses/:businessId/members` | Bearer + membership |
| `PATCH/DELETE` | `/api/businesses/:businessId/members/:userId` | Bearer + ADMIN+ |
| `GET/POST` | `/api/businesses/:businessId/invitations` | Bearer + ADMIN+ (invite ADMIN = OWNER) |
| `DELETE` | `/api/businesses/:businessId/invitations/:invitationId` | Bearer + ADMIN+ |
| `GET` | `/api/invitations/:token` | none (preview) |
| `POST` | `/api/invitations/:token/accept` | Bearer (mobile must match) |
| `GET` | `/api/me/invitations` | Bearer |
| `GET` | `/api/businesses/:businessId/branding` | Bearer + membership |
| `PATCH` | `/api/businesses/:businessId/branding` | Bearer + writable + `manage.settings` + white-label capability |
| `POST/DELETE` | `/api/businesses/:businessId/branding/logo` | same as PATCH |
| `GET` | `/api/businesses/:businessId/branding/logo/file` | Bearer + membership |
| `GET` | `/api/branding/resolve?host=` | none (custom domain → brand) |
| `GET` | `/api/businesses/:businessId/subscription` | Bearer + membership |
| `GET` | `/api/businesses/:businessId/entitlements` | Bearer + membership |
| `POST` | `/api/businesses/:businessId/gates/writable` | Bearer + EntitlementGuard (writable) |
| `POST` | `/api/businesses/:businessId/gates/export-pdf` | Bearer + `export.pdf` |
| `POST` | `/api/businesses/:businessId/gates/module-map` | Bearer + `module.map` |
| `POST` | `/api/businesses/:businessId/gates/module-org-chart` | Bearer + `module.org_chart` |
| `POST` | `/api/businesses/:businessId/gates/module-timeline` | Bearer + `module.timeline` |
| `GET` | `/api/billing/catalog` | Bearer |
| `POST` | `/api/businesses/:businessId/billing/checkout` | Bearer + **OWNER** (SAAS only) |
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
| `POST` | `/api/businesses/:businessId/documents/:documentId/workflow/submit` | Bearer + writable (draft→review) |
| `POST` | `/api/businesses/:businessId/documents/:documentId/workflow/approve` | Bearer + writable + OWNER/ADMIN |
| `POST` | `/api/businesses/:businessId/documents/:documentId/workflow/reject` | Bearer + writable + OWNER/ADMIN |
| `POST` | `/api/businesses/:businessId/documents/:documentId/workflow/publish` | Bearer + writable + OWNER/ADMIN (+ version) |
| `POST` | `/api/businesses/:businessId/documents/:documentId/workflow/unpublish` | Bearer + writable + OWNER/ADMIN |
| `POST` | `/api/businesses/:businessId/documents/:documentId/workflow/reopen` | Bearer + writable + OWNER/ADMIN |
| `GET` | `/api/businesses/:businessId/documents/:documentId/web-publish` | Bearer + membership |
| `PATCH` | `/api/businesses/:businessId/documents/:documentId/web-publish` | Bearer + writable + `documents.publish` |
| `GET` | `/api/public/documents/:businessId/:slug` | none (public HTML profile) |
| `GET` | `/api/public/documents/by-host?host=&slug=` | none (custom domain + slug) |
| `GET` | `/api/public/branding/:businessId/logo` | none (public logo bytes) |
| `GET` | `/api/businesses/:businessId/documents/:documentId/share-links` | Bearer + membership |
| `POST` | `/api/businesses/:businessId/documents/:documentId/share-links` | Bearer + writable + `documents.publish` |
| `POST` | `/api/businesses/:businessId/documents/:documentId/share-links/:shareId/revoke` | Bearer + writable + `documents.publish` |
| `GET` | `/api/public/share/:token` | none (meta + view when unlocked) |
| `POST` | `/api/public/share/:token/unlock` | none (password; Redis rate-limit) |
| `GET` | `/api/public/share/:token/file` | none (PDF bytes; session if password) |
| `GET` | `/api/marketplace/templates?businessId=` | Bearer + SAAS + `marketplace.templates` |
| `GET` | `/api/marketplace/templates/:id?businessId=` | Bearer + SAAS + `marketplace.templates` |
| `POST` | `/api/businesses/:businessId/marketplace/templates/:id/install` | Bearer + writable + entitlement + `manage.templates` |
| `GET` | `/api/plugins` | Bearer (first-party manifests; both editions) |
| `GET` | `/api/platform-admin/me` | Bearer (SAAS; returns isPlatformAdmin) |
| `GET` | `/api/platform-admin/users` | Bearer + platform_admin + SAAS |
| `GET` | `/api/platform-admin/businesses` | Bearer + platform_admin + SAAS |
| `POST` | `/api/platform-admin/businesses/:id/suspend` | Bearer + platform_admin + SAAS |
| `POST` | `/api/platform-admin/businesses/:id/unsuspend` | Bearer + platform_admin + SAAS |
| `GET` | `/api/platform-admin/subscriptions` | Bearer + platform_admin + SAAS |
| `GET` | `/api/platform-admin/jobs/failed` | Bearer + platform_admin + SAAS |
| `POST` | `/api/platform-admin/dunning/run` | Bearer + platform_admin + SAAS (optional `nowIso` fake clock) |
| `GET` | `/api/businesses/:businessId/analytics/summary` | Bearer + `audit.read` (OWNER/ADMIN) |
| `GET` | `/api/businesses/:businessId/documents/:documentId/comments` | Bearer + membership (`resolved=open\|resolved\|all`) |
| `POST` | `/api/businesses/:businessId/documents/:documentId/comments` | Bearer + writable |
| `PATCH` | `/api/businesses/:businessId/documents/:documentId/comments/:commentId` | Bearer + writable (author/OWNER/ADMIN) |
| `POST` | `/api/businesses/:businessId/documents/:documentId/comments/:commentId/resolve` | Bearer + writable |
| `POST` | `/api/businesses/:businessId/documents/:documentId/comments/:commentId/unresolve` | Bearer + writable (author/OWNER/ADMIN) |
| `DELETE` | `/api/businesses/:businessId/documents/:documentId/comments/:commentId` | Bearer + writable (author/OWNER/ADMIN) |
| `GET` | `/api/businesses/:businessId/audit-events` | Bearer + OWNER/ADMIN (tenant-scoped + safe login/license) |
| `POST` | `/api/businesses/:businessId/backups` | Bearer + writable + OWNER (enqueue ZIP) |
| `GET` | `/api/businesses/:businessId/backups` | Bearer + writable + OWNER |
| `GET` | `/api/businesses/:businessId/backups/:jobId` | Bearer + writable + OWNER |
| `GET` | `/api/businesses/:businessId/backups/:jobId/file` | Bearer + writable + OWNER (download ZIP) |
| `POST` | `/api/businesses/:businessId/restores/upload` | Bearer + writable + OWNER (multipart ZIP → preview) |
| `GET` | `/api/businesses/:businessId/restores/:jobId` | Bearer + writable + OWNER |
| `POST` | `/api/businesses/:businessId/restores/:jobId/commit` | Bearer + writable + OWNER (`confirmReplace` if not empty) |
| `GET` | `/api/businesses/:businessId/documents/:documentId/versions` | Bearer + membership |
| `POST` | `/api/businesses/:businessId/documents/:documentId/versions` | Bearer + writable (manual snapshot) |
| `GET` | `/api/businesses/:businessId/documents/:documentId/versions/compare` | Bearer + membership (`left`,`right`) |
| `GET` | `/api/businesses/:businessId/documents/:documentId/versions/:versionId` | Bearer + membership |
| `POST` | `/api/businesses/:businessId/documents/:documentId/versions/:versionId/restore` | Bearer + writable |
| `POST` | `/api/businesses/:businessId/documents/:documentId/versions/:versionId/clone` | Bearer + writable |
| `GET` | `/api/businesses/:businessId/project-categories` | Bearer + `@RequireModule(module.projects)` |
| `POST` | `/api/businesses/:businessId/project-categories` | Bearer + `@RequireModule(module.projects)` |
| `PATCH` | `/api/businesses/:businessId/project-categories/:categoryId` | Bearer + module.projects |
| `DELETE` | `/api/businesses/:businessId/project-categories/:categoryId` | Bearer + module.projects |
| `GET` | `/api/businesses/:businessId/projects` | Bearer + `@RequireModule(module.projects)` |
| `POST` | `/api/businesses/:businessId/projects` | Bearer + module.projects |
| `GET` | `/api/businesses/:businessId/projects/:projectId` | Bearer + module.projects |
| `PATCH` | `/api/businesses/:businessId/projects/:projectId` | Bearer + module.projects |
| `DELETE` | `/api/businesses/:businessId/projects/:projectId` | Bearer + module.projects |
| `POST` | `/api/businesses/:businessId/imports/projects/upload` | Bearer + module.projects + writable (multipart) |
| `GET` | `/api/businesses/:businessId/imports/:importId` | Bearer + module.projects |
| `PATCH` | `/api/businesses/:businessId/imports/:importId/mapping` | Bearer + module.projects + writable |
| `POST` | `/api/businesses/:businessId/imports/:importId/commit` | Bearer + module.projects + writable |
| `GET` | `/api/businesses/:businessId/team-members` | Bearer + membership |
| `POST` | `/api/businesses/:businessId/team-members` | Bearer + `@RequireWritable` |
| `GET` | `/api/businesses/:businessId/team-members/:memberId` | Bearer + membership |
| `PATCH` | `/api/businesses/:businessId/team-members/:memberId` | Bearer + `@RequireWritable` |
| `DELETE` | `/api/businesses/:businessId/team-members/:memberId` | Bearer + `@RequireWritable` |
| `GET` | `/api/businesses/:businessId/branches` | Bearer + membership |
| `POST` | `/api/businesses/:businessId/branches` | Bearer + `@RequireWritable` |
| `GET` | `/api/businesses/:businessId/branches/:branchId` | Bearer + membership |
| `PATCH` | `/api/businesses/:businessId/branches/:branchId` | Bearer + `@RequireWritable` |
| `DELETE` | `/api/businesses/:businessId/branches/:branchId` | Bearer + `@RequireWritable` |
| `GET` | `/api/businesses/:businessId/services` | Bearer + membership |
| `POST` | `/api/businesses/:businessId/services` | Bearer + `@RequireWritable` |
| `GET` | `/api/businesses/:businessId/services/:serviceId` | Bearer + membership |
| `PATCH` | `/api/businesses/:businessId/services/:serviceId` | Bearer + `@RequireWritable` |
| `DELETE` | `/api/businesses/:businessId/services/:serviceId` | Bearer + `@RequireWritable` |
| `GET` | `/api/businesses/:businessId/clients` | Bearer + membership |
| `POST` | `/api/businesses/:businessId/clients` | Bearer + `@RequireWritable` |
| `GET` | `/api/businesses/:businessId/clients/:clientId` | Bearer + membership |
| `PATCH` | `/api/businesses/:businessId/clients/:clientId` | Bearer + `@RequireWritable` |
| `DELETE` | `/api/businesses/:businessId/clients/:clientId` | Bearer + `@RequireWritable` |
| `GET` | `/api/businesses/:businessId/certificates` | Bearer + membership |
| `POST` | `/api/businesses/:businessId/certificates` | Bearer + `@RequireWritable` |
| `GET` | `/api/businesses/:businessId/certificates/:certificateId` | Bearer + membership |
| `PATCH` | `/api/businesses/:businessId/certificates/:certificateId` | Bearer + `@RequireWritable` |
| `DELETE` | `/api/businesses/:businessId/certificates/:certificateId` | Bearer + `@RequireWritable` |
| `GET` | `/api/businesses/:businessId/galleries` | Bearer + `@RequireModule(module.gallery)` |
| `POST` | `/api/businesses/:businessId/galleries` | Bearer + module.gallery |
| `GET` | `/api/businesses/:businessId/galleries/:galleryId` | Bearer + module.gallery |
| `PATCH` | `/api/businesses/:businessId/galleries/:galleryId` | Bearer + module.gallery |
| `DELETE` | `/api/businesses/:businessId/galleries/:galleryId` | Bearer + module.gallery |
| `POST` | `/api/businesses/:businessId/galleries/:galleryId/items` | Bearer + module.gallery |
| `PATCH` | `/api/businesses/:businessId/galleries/:galleryId/items/:itemId` | Bearer + module.gallery |
| `DELETE` | `/api/businesses/:businessId/galleries/:galleryId/items/:itemId` | Bearer + module.gallery |
| `PUT` | `/api/businesses/:businessId/galleries/:galleryId/items/reorder` | Bearer + module.gallery |
| `GET` | `/api/businesses/:businessId/locations` | Bearer + membership |
| `POST` | `/api/businesses/:businessId/locations` | Bearer + `@RequireWritable` |
| `GET` | `/api/businesses/:businessId/locations/:locationId` | Bearer + membership |
| `PATCH` | `/api/businesses/:businessId/locations/:locationId` | Bearer + `@RequireWritable` |
| `DELETE` | `/api/businesses/:businessId/locations/:locationId` | Bearer + `@RequireWritable` |
| `GET` | `/api/businesses/:businessId/map/markers` | Bearer + `@RequireModule(module.map)` |
| `GET` | `/api/businesses/:businessId/org-chart/tree` | Bearer + `@RequireModule(module.org_chart)` |
| `GET` | `/api/businesses/:businessId/timeline-events` | Bearer + `@RequireModule(module.timeline)` |
| `POST` | `/api/businesses/:businessId/timeline-events` | Bearer + `@RequireModule(module.timeline)` |
| `GET` | `/api/businesses/:businessId/timeline-events/:eventId` | Bearer + `@RequireModule(module.timeline)` |
| `PATCH` | `/api/businesses/:businessId/timeline-events/:eventId` | Bearer + `@RequireModule(module.timeline)` |
| `DELETE` | `/api/businesses/:businessId/timeline-events/:eventId` | Bearer + `@RequireModule(module.timeline)` |
| `POST` | `/api/businesses/:businessId/qr/encode` | Bearer + membership (core QR PNG data URL) |
| `GET` | `/api/businesses/:businessId/collections/:source` | Bearer + membership (+ module gate for `projects` / `timelineEvents`); query `locale=fa\|en` |
| `POST` | `/api/businesses/:businessId/documents/:documentId/export/pdf` | Bearer + `@RequireEntitlement(export.pdf)` (+ module gates if body has gated blocks) |
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
- Schema v3: masters + `pages[].masterId`; core blocks include `text` | `image` | `section` | `divider` | `headerSlot` | `footerSlot` | `qr` | `toc` (+ module blocks)
- Registry: `GET /api/businesses/:businessId/blocks`
- Safe bindings (ADR 016): `{{business.name}}`, `{{item.*}}`, `{{count(source)}}`, `{{count(source where field=value)}}` — whitelist parser in `@vdb/document-schema`; see `docs/schema/bindings.md`
- Smart pagination (ADR 017): optional `breakRules` on blocks; export/preview run `paginateDocumentBody` (estimate packer). Preview ≈ PDF packer; PDF adds CSS break hints. See `docs/schema/pagination.md`
- Interactive PDF (ADR 018): optional block `link` (`external`|`email`|`phone`|`internal`); TOC → `#h-{id}` anchors; Playwright `outline`+`tagged` for bookmarks from headings
- Layout only — no Business data in templates
- Mutate routes use `EntitlementGuard` + `@RequireWritable`
- Master render contract: see `docs/adr/006-master-pages.md` (header → body → footer → page number)

### Documents

- PG `documents` (`title`, `status` draft|published, `template_id`, **`locale` fa|en**) + Mongo `document_bodies` (mirrors `locale`)
- Create copies template block snapshot; `dataRefs` for Business Data (empty at create)
- Soft-delete PG + remove Mongo body — see `docs/adr/004-document-crud.md`
- Validate body with `@vdb/document-schema` v3 (`masters` + `pages`)
- Content locale (ADR 015): PATCH `locale` / `body.locale`; PDF `dir`/`lang` + collections `?locale=` follow document locale — not UI chrome next-intl
- Mutate routes use `EntitlementGuard` + `@RequireWritable`
- **Editor (web):** flow shell at `/app/documents/:documentId` — Zustand undo/redo, dnd-kit vertical reorder, HTML preview with master header/footer/page numbers, document-language switch, autosave debounce **800ms** via PATCH (never PDF on keystroke). See `docs/adr/005-editor-shell-autosave.md` + `docs/adr/006-master-pages.md`
- **Versioning (ADR 020):** PG `document_versions` + Mongo `document_version_bodies`; auto snapshot on publish; manual snapshot; restore/clone; published body lock (`DOCUMENT_PUBLISHED_LOCKED`); editor history panel with metadata compare
- **Approval workflow (ADR 021):** `draft → review → approved → published`; OWNER/ADMIN approve/publish; audit_events; PDF export only for `approved`|`published`
- **Comments (ADR 022):** PG `document_comments` with optional `pageId`/`blockId`; resolve; mentions out of MVP
- **Audit log (ADR 023):** writers for login / business / payment / license / export / document delete + workflow; `GET .../audit-events` OWNER/ADMIN; UI `/app/audit`
- **Backup / restore (ADR 024):** ZIP `vdb.business-backup` v1; BullMQ jobs; OWNER + writable; restore preview + `confirmReplace`; UI `/app/backup`

### Projects / Portfolio (Phase 02)

- PG `project_categories` + `projects` (`business_id`, soft-delete)
- Sellable entitlement **`module.projects`** (not in `plan.core` base) — see `.cursor/rules/14-content-entities.mdc`
- Fields: title, description, status (`draft|published|archived`), category, `coverMediaId` / `mediaIds`, flexible `fields` JSON, optional FK `locationId` → `locations`
- Optional `translations` (ADR 015): `{ "en": { … } }` on create/update; FA in canonical columns; responses include `translations`
- UI: `/app/projects` (fa/en); locked when module missing
- Mutate + list require `@RequireModule(module.projects)`

### Content import (Excel/CSV — Projects)

- PG `import_jobs` + ObjectStorage temp file; ADR 019
- Flow: upload → map columns → preview → transactional commit (valid rows)
- Large files: BullMQ `import.content` when rows > `IMPORT_SYNC_MAX_ROWS`
- Env: `IMPORT_MAX_BYTES`, `IMPORT_MAX_ROWS`, `IMPORT_SYNC_MAX_ROWS`
- UI wizard on `/app/projects`

### Team & branches (Phase 02)

- PG `team_members` + `branches` — foundational Business Data (no separate sellable module)
- List/get: membership; mutate: `@RequireWritable`
- Member: name, roleTitle, department, photoMediaId, branchId?, **parentMemberId?** (reporting line), sortOrder, fields
- Branch: name, address fields, phone, optional FK `locationId` → `locations`, sortOrder, fields
- Optional `translations` on members (`name`/`roleTitle`/`department`) and branches (name + address lines)
- UI: `/app/team` — parent picker on create; feeds Org Chart / Map

### Organization Chart (Phase 02)

- Sellable entitlement **`module.org_chart`** (catalog seeded)
- Reporting edges on `team_members.parent_member_id` (same Business; cycle rejected)
- Tree API: `GET /api/businesses/:businessId/org-chart/tree?rootMemberId=&locale=` (`@RequireModule(module.org_chart)`)
- Block type `orgChart` — props: layout (`tree-vertical`|`tree-horizontal`), rootMemberId?, showPhotos, heightPx
- Editor + PDF: HTML/CSS tree (ADR 009)
- Saving / exporting documents with `orgChart` blocks asserts `module.org_chart`
- UI: `/app/org-chart` (structure parent form + preview)

### Timeline (Phase 02)

- Sellable entitlement **`module.timeline`** (catalog seeded)
- PG `timeline_events` (`occurred_at`, `title`, `body`, optional `media_id`, `sort_order`, `fields`, `translations`)
- CRUD: `/api/businesses/:businessId/timeline-events` (`@RequireModule(module.timeline)`); optional `translations` `{ en: { title, body } }`
- Block type `timeline` — props: layout (`vertical`|`alternating`), limit, heightPx
- Editor + PDF: HTML/CSS timeline (ADR 010)
- Saving / exporting documents with `timeline` blocks asserts `module.timeline`
- UI: `/app/timeline`

### QR block (Phase 02 — core)

- Core block type `qr` (no sellable module) — props: `targetType` (`url|phone|email|map|custom`), `value`, `sizePx`, `caption`
- Payload encoding: `buildQrPayload` in `@vdb/document-schema`
- Server encode (PNG data URL): `POST /api/businesses/:businessId/qr/encode` (membership) + PDF HTML embed (ADR 011)
- **Non-goal:** dynamic redirect / tracked short-link QR destinations
- Editor palette shows QR for all businesses; preview calls encode API

### Auto TOC (Phase 02 — core)

- Core block type `toc` — props: `maxLevel` (1–3), `showPageNumbers`, optional `title`
- Entries from `section.title` (+ `headingLevel`) and `text` with `headingLevel` 1–3
- Page numbers = **logical** `pages[]` 1-based index (ADR 012) — not Chromium print-sheet pages
- Shared `buildTableOfContents` in `@vdb/document-schema` for editor preview + PDF HTML

### Collection repeater (Phase 02 — core)

- Core block type `repeater` — props: `source`, `limit`, `emptyMessage`; children = card template
- Sources: `projects` | `teamMembers` | `branches` | `services` | `clients` | `certificates` | `timelineEvents`
- Binding: `{{item.<key>}}` only (ADR 013) — no formulas
- Data: `GET /api/businesses/:businessId/collections/:source` (+ export resolve); response includes `total` count
- Gates: `projects` → `module.projects`; `timelineEvents` → `module.timeline` (on collections GET, document save, PDF enqueue)
- Nested repeater unsupported in MVP

### Conditional visibility (Phase 02 — basic)

- Optional `when` on any block: `{ op: exists|empty|eq, path, value? }` (ADR 014)
- MVP paths: `collection.<source>` → item count
- Evaluated in editor HTML preview + PDF HTML; TOC skips hidden blocks
- UI: inspector condition builder (fa/en)

### Module entitlements wire-up (Phase 02)

- Catalog seed: `plan.core` + modules `module.map|org_chart|timeline|projects|gallery` (add-ons)
- `documentCollectRequiredModuleCodes` drives save/export/template deny (**403**)
- Editor palette: allowed blocks only; locked list + upgrade CTA → `/app/billing`
- Entitlements panel lists all module codes + CTA
- Content pages show upgrade CTA when module missing

### Services / Clients / Certificates (Phase 02)

- PG `business_services`, `clients`, `certificates` — **foundational** Business Data (no sellable `module.*`)
- List/get: membership; mutate: `@RequireWritable`
- Service: name, description, iconMediaId?, sortOrder, fields; optional `translations` (`name`/`description`)
- Client: name, website, logoMediaId?, sortOrder, fields; optional `translations` (`name`)
- Certificate: name, issuer, issuedAt/expiresAt?, documentMediaId?, sortOrder, fields; optional `translations` (`name`/`issuer`)
- Media refs must belong to the same Business
- UI: `/app/profile-content` (fa/en)

### Gallery (Phase 02)

- PG `galleries` + `gallery_items` (`business_id`, soft-delete)
- Sellable entitlement **`module.gallery`** (not in `plan.core` base)
- Items: `mediaId` (Media Library), `caption`, `sortOrder`; reorder via `PUT .../items/reorder`
- Document block type `gallery` (`moduleCode: module.gallery`, props `{ galleryId }`)
- UI: `/app/galleries`; editor palette shows gallery when module enabled
- All routes require `@RequireModule(module.gallery)` (implies writable)

### Locations (Phase 02)

- PG `locations` — foundational shared geography (no sellable module)
- Fields: name, country, province, city, address, required `lat`/`lng` (WGS84 validated)
- FK: `projects.location_id`, `branches.location_id` → `locations` (`ON DELETE SET NULL`)
- List/get: membership; mutate: `@RequireWritable`
- Soft-delete blocked while linked (`LOCATION_IN_USE`)
- UI: `/app/locations`; pickers on Projects + Team/Branches
- Markers consumed by Map Engine (`module.map`) — no duplicate lat/lng store

### Map Engine (Phase 02)

- Sellable entitlement **`module.map`** (catalog seeded)
- Block type `map` in Mongo document/template body — props: centerLat/Lng, zoom, markersSource (`locations|branches|projects|none`), countryRestriction, showMarkers, heightPx
- Markers API: `GET /api/businesses/:businessId/map/markers?source=&country=&locale=` (`@RequireModule(module.map)`); branch/project labels localized via `pickLocalized`
- Editor: Leaflet + OSM interactive preview; PDF: static image or placeholder (`MAP_STATIC_URL_TEMPLATE`, ADR 008)
- Saving / exporting documents that contain `map` blocks asserts `module.map`
- UI: `/app/map` + editor palette when entitled

### PDF export

- PG `export_jobs` (`queued` → `processing` → `completed`|`failed`) + Redis/BullMQ queue `export.pdf`
- Canonical HTML from document body + design theme + `@font-face` embeds (ObjectStorage fonts)
- `PDF_RENDERER=fake|playwright` — fake for CI/dev; Playwright Chromium for production workers
- Storage key: `{businessId}/exports/{jobId}/document.pdf`
- Gate: `POST .../export/pdf` requires `export.pdf` (UI mirrors via entitlements)
- Cost controls (ADR 033 / pre-GA): `EXPORT_MAX_CONCURRENT_PER_BUSINESS`, Redis `EXPORT_RATE_*` → `429` codes `EXPORT_TOO_MANY_CONCURRENT` / `EXPORT_RATE_LIMITED`; worker `EXPORT_WORKER_CONCURRENCY`
- See `docs/adr/007-pdf-export-pipeline.md`, `docs/adr/033-performance-security-hardening.md`, `docs/qa/pre-ga-hardening.md`

### Catalog

- Seed: `plan.core` (base entitlement `export.pdf`) + modules `module.map|org_chart|timeline|projects|gallery`
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

### Phase 02–04 + GA

- Corporate: `npm run test:e2e:corporate` · `docs/qa/phase-02-corporate-acceptance.md`
- Professional: `npm run test:e2e:professional` · `docs/qa/phase-03-professional-acceptance.md`
- Product surfaces (members, branding, web-publish, share, analytics, marketplace, plugins, platform-admin, dunning): routes in this README table + `docs/api/openapi.yaml`
- Hardening: `docs/qa/pre-ga-hardening.md` · ADR 033
- **GA catalog exit:** `docs/qa/GA-checklist.md`
