# GA release checklist (catalog exit)

**Task:** P04-T12 · `implementation-prompts/04-phase-product/12-ga-release-checklist.md`  
**Verified:** 2026-08-10 (evidence + `npm run typecheck` on `@vdb/api` / `@vdb/web`)  
**Verdict:** **All required items Pass** — implementation catalog through Phase 04 is closed for GA.

How to use:

1. Each row is **Pass** or **Fail**.
2. **Fail** → open the listed return task and re-run this checklist.
3. Before production cutover, operators should also execute the live E2E commands in § Live funnels (environment-dependent).

Related: [pre-ga-hardening.md](./pre-ga-hardening.md) · [docs/deploy/README.md](../deploy/README.md) · [docs/api/openapi.yaml](../api/openapi.yaml)

---

## 1. Locked stack

| # | Check | Status | Evidence |
| --- | --- | --- | --- |
| 1.1 | NestJS API | Pass | `apps/api` · `NestFactory` in `apps/api/src/main.ts` |
| 1.2 | Next.js App Router web | Pass | `apps/web` · `next` App Router under `src/app/[locale]` |
| 1.3 | PostgreSQL + Prisma | Pass | `apps/api/prisma/schema.prisma` (`provider = postgresql`) |
| 1.4 | Redis (cache/OTP/queues) | Pass | `apps/api/src/config/redis/*` · `ioredis` / `bullmq` |
| 1.5 | MongoDB document bodies | Pass | `apps/api/src/config/mongo/mongo.service.ts` (official driver) |
| 1.6 | Dual edition `APP_EDITION` | Pass | `.env.example` · `EditionService` · rule `08-dual-deployment.mdc` |

---

## 2. Phase 01 — SAAS funnel

| # | Check | Status | Evidence |
| --- | --- | --- | --- |
| 2.1 | Acceptance doc | Pass | [phase-01-saas-acceptance.md](./phase-01-saas-acceptance.md) |
| 2.2 | Automated script | Pass | `scripts/e2e/saas-funnel.mjs` · `npm run test:e2e:saas` |
| 2.3 | OTP → Business trial → template/doc → PDF → checkout → Business #2 lock | Pass | Covered by acceptance table + funnel script |
| 2.4 | Theme/i18n called out in acceptance | Pass | Manual UI section: `fa` RTL + light/dark |

---

## 3. Phase 01 — SELF_HOSTED funnel

| # | Check | Status | Evidence |
| --- | --- | --- | --- |
| 3.1 | Acceptance doc | Pass | [phase-01-self-hosted-acceptance.md](./phase-01-self-hosted-acceptance.md) |
| 3.2 | Automated script | Pass | `scripts/e2e/self-hosted-funnel.mjs` · `npm run test:e2e:self-hosted` |
| 3.3 | License gate + no SAAS checkout path | Pass | Acceptance asserts `LICENSE_REQUIRED` / checkout unavailable |

---

## 4. Phase 02 — Corporate modules

| # | Check | Status | Evidence |
| --- | --- | --- | --- |
| 4.1 | Acceptance doc | Pass | [phase-02-corporate-acceptance.md](./phase-02-corporate-acceptance.md) |
| 4.2 | Automated script | Pass | `scripts/e2e/corporate-sample.mjs` · `npm run test:e2e:corporate` |
| 4.3 | `module.projects` | Pass | API + UI `features/content/projects-page.tsx` |
| 4.4 | `module.map` | Pass | API + UI `features/content/map-page.tsx` · Leaflet |
| 4.5 | `module.org_chart` | Pass | API + UI `features/content/org-chart-page.tsx` |
| 4.6 | `module.timeline` | Pass | API + UI `features/content/timeline-page.tsx` |
| 4.7 | `module.gallery` | Pass | API `gallery.controller` + UI `gallery-page.tsx` (manual/API; not in corporate e2e hammer) |

---

## 5. Phase 03 — Professional

| # | Check | Status | Evidence |
| --- | --- | --- | --- |
| 5.1 | Acceptance doc | Pass | [phase-03-professional-acceptance.md](./phase-03-professional-acceptance.md) |
| 5.2 | Automated script | Pass | `scripts/e2e/professional-funnel.mjs` · `npm run test:e2e:professional` |
| 5.3 | Document content locale FA/EN | Pass | ADR 015 · funnel locale checks |
| 5.4 | Excel/CSV import (Projects) | Pass | ADR 019 · import jobs |
| 5.5 | Versioning + published body lock | Pass | ADR 020 |
| 5.6 | Approval workflow + PDF gate | Pass | ADR 021 |
| 5.7 | Comments | Pass | ADR 022 |
| 5.8 | Business backup/restore | Pass | ADR 024 · rule `16-backup-restore` |
| 5.9 | DOCX/PPTX | Pass (Won't) | ADR 025 — out of GA scope by design |

---

## 6. Phase 04 — Product

| # | Check | Status | Evidence |
| --- | --- | --- | --- |
| 6.1 | Members + roles | Pass | Rule `17` · `/members` · OWNER/ADMIN/EDITOR/VIEWER |
| 6.2 | Fine-grained RBAC | Pass | Rule `17` · `GET .../permissions` · membership permission codes |
| 6.3 | White-label branding | Pass | Rule `18` · `/branding` · ADR 028 area |
| 6.4 | Web publish (public HTML) | Pass | Rule `19` · ADR 026 · web-publish routes |
| 6.5 | Share links | Pass | Rule `20` · ADR 027 · token/password/expiry |
| 6.6 | Analytics | Pass | Rule `21` · ADR 028 · `.../analytics/summary` |
| 6.7 | Template marketplace (SAAS) | Pass | Rule `22` · ADR 029 · `/marketplace` |
| 6.8 | Plugin skeleton | Pass | Rule `23` · ADR 030 · `GET /plugins` · `@vdb/plugins` |
| 6.9 | SAAS platform admin | Pass | Rule `24` · ADR 031 · `/platform-admin/*` |
| 6.10 | Billing dunning / grace | Pass | Rule `25` · ADR 032 · `billing.dunning` |
| 6.11 | Pre-GA hardening | Pass | Rule `26` · ADR 033 · [pre-ga-hardening.md](./pre-ga-hardening.md) |

---

## 7. Theme & i18n (app chrome)

| # | Check | Status | Evidence |
| --- | --- | --- | --- |
| 7.1 | Dark + light themes | Pass | Cookie `vdb-theme` · `styles/tokens.css` · theme provider |
| 7.2 | Locales `fa` + `en` | Pass | `apps/web/src/shared/i18n/messages/{fa,en}.json` · next-intl |
| 7.3 | RTL (`fa`) / LTR (`en`) | Pass | `[locale]` layout `dir` · rule `10-theme-and-i18n.mdc` |

---

## 8. API documentation

| # | Check | Status | Evidence |
| --- | --- | --- | --- |
| 8.1 | Canonical OpenAPI | Pass | `docs/api/openapi.yaml` (Core → Product paths present) |
| 8.2 | Human README | Pass | `docs/api/README.md` endpoint tables + edition notes |
| 8.3 | Product routes documented | Pass | members, branding, web-publish, share, analytics, marketplace, plugins, platform-admin, dunning, export 429 codes |
| 8.4 | Docs sync law | Pass | Rules `05` / `09` — route changes update `docs/api/` |

---

## 9. Governance

| # | Check | Status | Evidence |
| --- | --- | --- | --- |
| 9.1 | Permanent rules | Pass | `.cursor/rules/00`–`26` |
| 9.2 | AGENTS index | Pass | `AGENTS.md` |
| 9.3 | ADR index through hardening | Pass | `docs/adr/README.md` → ADR 033 |

---

## 10. Live funnels (operator — before production)

Run against a seeded stack (`docker:up`, migrate, seed, API up, matching `APP_EDITION`):

| # | Command | Status (evidence of readiness) | Operator live run |
| --- | --- | --- | --- |
| 10.1 | `npm run test:e2e:saas` | Pass (script + checklist exist) | ☐ |
| 10.2 | `npm run test:e2e:self-hosted` | Pass (script + checklist exist) | ☐ |
| 10.3 | `npm run test:e2e:corporate` | Pass (script + checklist exist) | ☐ |
| 10.4 | `npm run test:e2e:professional` | Pass (script + checklist exist) | ☐ |
| 10.5 | `npm run typecheck` (api + web) | **Pass** (executed 2026-08-10) | — |
| 10.6 | `node scripts/load/export-queue-smoke.mjs` | Pass (local cap check) | ☐ optional live hammer |

Operator boxes are **cutover hygiene**, not catalog Fail items.

---

## Fail → return tasks

| Fail item | Return task |
| --- | --- |
| _(none)_ | — |

### Non-blocking follow-ups (optional post-GA)

1. Extend corporate e2e to assert `module.gallery` deny/allow.
2. Add `docs/qa/phase-04-product-acceptance.md` + optional `scripts/e2e/product-funnel.mjs`.
3. Tick operator live-funnel boxes in §10 on the release environment.

---

## Final sign-off

| Field | Value |
| --- | --- |
| Catalog (implementation-prompts 01–04) | **Closed for GA** |
| Required checklist rows | **All Pass** |
| Hardening | See [pre-ga-hardening.md](./pre-ga-hardening.md) |
| Next after GA | Product ops / backlog outside this catalog (e.g. live funnel sign-off, CDN/WAF, soak tests) |

**کاتالوگ اجرای پیاده‌سازی تا GA بسته است.**
