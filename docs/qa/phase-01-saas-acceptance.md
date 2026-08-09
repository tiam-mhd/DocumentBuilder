# Phase 01 — SAAS acceptance (Core exit)

Edition under test: **`APP_EDITION=SAAS`**.

Automated API path: `npm run test:e2e:saas` → [`scripts/e2e/saas-funnel.mjs`](../../scripts/e2e/saas-funnel.mjs).

Manual UI path uses locale **`fa`** (RTL) and both app chrome themes (`vdb-theme` light/dark).

## Preconditions

1. `npm run docker:up`
2. `apps/api/.env`: `APP_EDITION=SAAS`, `SMS_PROVIDER=fake`, `PAYMENT_PROVIDER=fake`, `PDF_RENDERER=fake`, `NODE_ENV=development`
3. `npm run migrate` + `npm run db:seed`
4. `npm run api:dev` (and `npm run web:dev` for UI checks)

## Automated checklist (API)

| # | Step | Expected |
| --- | --- | --- |
| 1 | `GET /api/system/config` | `edition=SAAS`, `publicSignup=true` |
| 2 | OTP request + verify (fake `devCode`) | JWT access token |
| 3 | Create first Business | Subscription `trial`, `writable=true` |
| 4 | Entitlements | includes `export.pdf` (from `plan.core` seed) |
| 5 | Template → Document → `POST .../export/pdf` | job → `completed` → PDF `%PDF-` |
| 6 | Checkout `plan.core` + webhook confirm (fake) | Subscription `active` |
| 7 | Export again on paid Business | succeeds |
| 8 | Create Business #2 | `pending_payment`, `writable=false` |
| 9 | Mutate / `gates/export-pdf` on #2 | `402` + `SUBSCRIPTION_NOT_WRITABLE` |

## Manual UI checklist (`/fa`)

Walk with **light** then **dark** theme (toggle in chrome). Confirm RTL layout (`dir=rtl`).

| # | Path / action | Expected |
| --- | --- | --- |
| 1 | `/fa` → ورود با موبایل | OTP form; Persian copy |
| 2 | Request OTP (dev) → verify | Lands in `/fa/app` |
| 3 | ایجاد کسب‌وکار اول | Trial banner / writable editor |
| 4 | قالب → سند → ویرایشگر | Autosave; **no** PDF on every keystroke |
| 5 | پنل خروجی PDF | Job status → دانلود |
| 6 | `/fa/app/billing` → خرید با fake | Return `ok=1`; subscription active |
| 7 | کسب‌وکار دوم | Locked / pending payment; mutate CTA disabled |
| 8 | Switch back to paid Business | Export still works |

## Out of scope for this checklist

- Playwright Chromium browser pack (optional later; API script is the Phase 01 gate)
- SELF_HOSTED license path → see `phase-01-self-hosted-acceptance.md` (P01-T19)
- Real Zarinpal / SMS providers

## Pass criteria (Core exit — SAAS)

- [ ] `npm run test:e2e:saas` exits 0
- [ ] Manual fa UI rows above checked (or waived with note)
- [ ] No entitlement-only-in-UI gaps for export / second Business
