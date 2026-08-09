# Phase 01 — SELF_HOSTED acceptance (Core exit)

Edition under test: **`APP_EDITION=SELF_HOSTED`**.

Automated API path: `npm run test:e2e:self-hosted` → [`scripts/e2e/self-hosted-funnel.mjs`](../../scripts/e2e/self-hosted-funnel.mjs).

Manual UI path uses locale **`fa`** (RTL) and both app chrome themes (`vdb-theme` light/dark).

Same Core as SAAS (OTP → Business → Document → PDF). Difference: **install license** instead of platform checkout; **no public signup flag**.

## Preconditions

1. `npm run docker:up`
2. `apps/api/.env`:
   - `APP_EDITION=SELF_HOSTED`
   - `SMS_PROVIDER=fake`, `PDF_RENDERER=fake`, `NODE_ENV=development`
   - `LICENSE_PEPPER=…`, `LICENSE_ISSUER_SECRET=` (empty → opaque `VDB-…` keys)
3. Prefer **no** active row in `installation_licenses` (full deny→activate coverage). To reset:

   ```sql
   UPDATE installation_licenses SET revoked_at = NOW() WHERE revoked_at IS NULL;
   ```

4. `npm run migrate` + `npm run db:seed`
5. Restart API after changing `APP_EDITION`
6. `npm run web:dev` for UI checks

## Automated checklist (API)

| # | Step | Expected |
| --- | --- | --- |
| 1 | `GET /api/system/config` | `edition=SELF_HOSTED`, `publicSignup=false`, `licenseActivation=true`, `platformCheckout=false` |
| 2 | `GET /api/system/license` | `required=true`; ideally `active=false` before activate |
| 3 | OTP request + verify | JWT (same identity Core) |
| 4 | Create Business | Allowed without license (create is free) |
| 5 | Mutate / `gates/export-pdf` **before** license | `402` + `LICENSE_REQUIRED` |
| 6 | `POST /api/system/license/activate` (`VDB-…` key) | `active=true` |
| 7 | Template → Document → export PDF | job → `completed` → `%PDF-` |
| 8 | `POST .../billing/checkout` | `BILLING_CHECKOUT_UNAVAILABLE` (no SAAS pay path) |

If a license is already active, the script **skips** steps 5–6 and still asserts export + checkout block.

## Manual UI checklist (`/fa`)

Walk with **light** then **dark** theme. Confirm RTL.

| # | Path / action | Expected |
| --- | --- | --- |
| 1 | `/fa` home / system flags | No SAAS “public signup” messaging as required |
| 2 | ورود با موبایل | OTP works (invite-only UX may still use OTP API) |
| 3 | `/fa/app/license` without key | Shows required / locked |
| 4 | Activate opaque or signed key | Status active; sensitive features unlock |
| 5 | کسب‌وکار → سند → خروجی PDF | Same Core editor; export works |
| 6 | Billing / checkout CTAs | Disabled or unavailable (license path, not Zarinpal) |

## Diff vs SAAS (must hold)

| Concern | SAAS | SELF_HOSTED |
| --- | --- | --- |
| `publicSignup` | true | false |
| Install license | N/A (`licenseActive` always true) | Required for mutate/export |
| Platform checkout | fake/Zarinpal | `BILLING_CHECKOUT_UNAVAILABLE` |
| Document / PDF Core | same | same |

## Pass criteria (Core exit — SELF_HOSTED)

- [ ] `npm run test:e2e:self-hosted` exits 0 (API with `APP_EDITION=SELF_HOSTED`)
- [ ] Manual fa UI rows checked (or waived with note)
- [ ] No SAAS checkout dependency on this edition

## Related

- SAAS funnel: `phase-01-saas-acceptance.md` / `npm run test:e2e:saas`
- Deploy license notes: `docs/deploy/README.md`
