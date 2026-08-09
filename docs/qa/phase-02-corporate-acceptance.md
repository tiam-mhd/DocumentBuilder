# Phase 02 — Corporate acceptance

Edition under test for the automated path: **`APP_EDITION=SAAS`** (module checkout attaches `module.map|org_chart|timeline|projects`).

Automated API path: `npm run test:e2e:corporate` → [`scripts/e2e/corporate-sample.mjs`](../../scripts/e2e/corporate-sample.mjs).

Document body fixture: [`scripts/e2e/fixtures/corporate-document-body.mjs`](../../scripts/e2e/fixtures/corporate-document-body.mjs).

Manual UI path uses locale **`fa`** (RTL) and both app chrome themes (`vdb-theme` light/dark).

## Preconditions

1. `npm run docker:up`
2. `apps/api/.env`: `APP_EDITION=SAAS`, `SMS_PROVIDER=fake`, `PAYMENT_PROVIDER=fake`, `PDF_RENDERER=fake`, `NODE_ENV=development`
3. `npm run migrate` + `npm run db:seed` (catalog: `plan.core` + corporate modules)
4. `npm run api:dev` (and `npm run web:dev` for UI checks)
5. Phase 01 SAAS funnel should already pass (`npm run test:e2e:saas`)

## Automated checklist (API)

| # | Step | Expected |
| --- | --- | --- |
| 1 | Health + `GET /api/system/config` | `edition=SAAS` |
| 2 | OTP signup → first Business | Trial writable |
| 3 | Checkout `plan.core` + modules map/org_chart/timeline/projects → webhook | Entitlements include all four modules |
| 4 | Seed Location + Team (CEO→CTO) + Projects + Timeline events | `200` |
| 5 | Template → Document → PATCH corporate body (TOC, repeater, map, orgChart, timeline, `when` on certificates) | Save succeeds |
| 6 | `GET .../collections/projects` | `total >= 2` |
| 7 | `POST .../export/pdf` → poll → download | job `completed`, body starts with `%PDF-` |
| 8 | New user/Business **without** modules → `POST .../gates/module-map` | `403` + `ENTITLEMENT_MODULE_REQUIRED` |
| 9 | Same Business: PATCH document body with `map` block | `403` + `ENTITLEMENT_MODULE_REQUIRED` |

## Manual UI checklist (`/fa`)

Walk with **light** then **dark** theme. Confirm RTL.

| # | Path / action | Expected |
| --- | --- | --- |
| 1 | `/fa/app/billing` → buy Core + Map/Org/Timeline/Projects (fake) | Modules show allowed in entitlements panel |
| 2 | `/fa/app/locations` + `/fa/app/team` + `/fa/app/projects` + `/fa/app/timeline` | Create sample rows |
| 3 | `/fa/app/map` / org-chart / timeline | Previews load (module unlocked) |
| 4 | Templates → Documents → editor | Palette shows module blocks; locked list empty (or upgrade CTA if missing) |
| 5 | Add TOC + map + org + timeline + projects repeater | Live HTML preview; autosave **without** PDF on keystroke |
| 6 | Export panel → PDF | Job completes; download opens |
| 7 | Business / account **without** `module.map` | Map page + palette show upgrade CTA; saving map block fails with module error |

## Out of scope

- Playwright browser pack (API script is the Phase 02 gate)
- Phase 03 import / advanced formulas
- SELF_HOSTED module attach without SAAS checkout (install still uses same Core gates; attach modules via ops/DB if needed for on-prem demos)

## Pass criteria (Corporate exit)

- [ ] `npm run test:e2e:corporate` exits 0
- [ ] Manual fa UI rows above checked (or waived with note)
- [ ] Phase 02 task catalog `01→14` complete
- [ ] No “module only in UI” gaps for map/org/timeline/projects/gallery
