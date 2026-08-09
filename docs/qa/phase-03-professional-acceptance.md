# Phase 03 — Professional acceptance

Edition under test for the automated path: **`APP_EDITION=SAAS`**.

Automated API path: `npm run test:e2e:professional` → [`scripts/e2e/professional-funnel.mjs`](../../scripts/e2e/professional-funnel.mjs).

Document body fixture: [`scripts/e2e/fixtures/professional-document-body.mjs`](../../scripts/e2e/fixtures/professional-document-body.mjs).

Manual UI path uses locale **`fa`** (RTL) and both app chrome themes (`vdb-theme` light/dark). Document content locale (`documents.locale`) is separate from UI chrome.

## Preconditions

1. `npm run docker:up`
2. `apps/api/.env`: `APP_EDITION=SAAS`, `SMS_PROVIDER=fake`, `PAYMENT_PROVIDER=fake`, `PDF_RENDERER=fake`, `NODE_ENV=development`
3. `npm run migrate` (includes `workspace_backup_jobs` / `workspace_restore_jobs`) + `npm run db:seed`
4. `npm run api:dev` (and `npm run web:dev` for UI checks)
5. Prefer Phase 01/02 gates already green: `test:e2e:saas`, `test:e2e:corporate`

## Automated checklist (API)

| # | Step | Expected |
| --- | --- | --- |
| 1 | Health + `GET /api/system/config` | `edition=SAAS` |
| 2 | OTP → Business → checkout `plan.core` + `module.projects` | Writable + module |
| 3 | Create project with `translations.en` | `200` |
| 4 | CSV import upload → mapping → commit | `created >= 2` |
| 5 | `GET .../collections/projects?locale=fa\|en` | Localized titles present |
| 6 | Template + Document → PATCH heavy body (TOC, repeater, `{{count}}`, link, many sections) | Save ok |
| 7 | In-process `paginateDocumentBody` | `pages.length >= 2` |
| 8 | PATCH `locale=en` | Document/body locale `en` |
| 9 | Comment create + resolve | `200` |
| 10 | Manual version snapshot | `200` |
| 11 | `POST .../export/pdf` while `draft` | `403/409` `DOCUMENT_NOT_APPROVED_FOR_EXPORT` |
| 12 | Workflow submit → approve → PDF → publish | PDF `%PDF-`; status `published`; versions ≥ 2 |
| 13 | PATCH body while published | `DOCUMENT_PUBLISHED_LOCKED` |
| 14 | `GET .../audit-events` (OWNER) | Includes `document.workflow.*` |
| 15 | Backup enqueue → download ZIP → restore upload → `confirmReplace` commit | ZIP `PK…`; restore `remappedEntities > 0` |

## Manual UI checklist (`/fa`)

Walk with **light** then **dark**. Confirm RTL chrome; switch document content locale in editor where available.

| # | Path / action | Expected |
| --- | --- | --- |
| 1 | `/fa/app/projects` → import wizard CSV | Rows appear after commit |
| 2 | Editor: many sections + TOC + repeater | Preview packs; autosave **without** PDF on keystroke |
| 3 | Document language FA → EN | Preview `dir`/`lang` follow document locale |
| 4 | Comments panel | Create / resolve |
| 5 | Versions / workflow | Submit → approve → publish; body locked while published |
| 6 | Export PDF after approve/publish | Completes |
| 7 | `/fa/app/audit` (Owner/Admin) | Events listed |
| 8 | `/fa/app/backup` (Owner) | Backup download; restore preview requires confirm when not empty |

## Out of scope / known gaps

| Gap | Notes |
| --- | --- |
| Playwright browser pack | API script is the Phase 03 gate (same as P01/P02) |
| DOCX/PPTX export | Explicit **Won't** — ADR 025 / spike report |
| Backup asserts every media byte | Asserts job + ZIP magic + restore remaps; not full binary matrix |
| Pagination vs Chromium sheets | Asserts shared **logical** packer (`paginateDocumentBody`); print-sheet reflow remains PDF-engine approximate |
| SELF_HOSTED professional funnel | Same APIs; SAAS checkout used here for modules — on-prem can attach modules via ops if needed |
| Gallery / map / org in this funnel | Covered by `test:e2e:corporate` (Phase 02) |

## Pass criteria (Professional exit)

- [ ] `npm run test:e2e:professional` exits 0
- [ ] Manual fa UI rows above checked (or waived with note)
- [ ] Phase 03 task catalog `01→12` complete (T11 = Won't Non-goal)
- [ ] Exit criteria from `implementation-prompts/03-phase-professional/00-phase-overview.md`: FA/EN document data, import, version+approve, backup/restore

## Related

- Phase overview: `implementation-prompts/03-phase-professional/00-phase-overview.md`
- Rules: `.cursor/rules/06-delivery-workflow.mdc`, `07-document-editor.mdc` (DOCX Non-goal), `16-backup-restore.mdc`
