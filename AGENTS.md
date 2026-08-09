# AGENTS.md — Visual Document Builder

You are working in **Visual Document Builder** (VDB).

## Mandatory

1. **Read and follow every file in `.cursor/rules/`** on every task. These are permanent project laws.
2. Operate as a **senior engineer**: consistent architecture, secure tenancy, no shortcuts around billing gates.
3. Locked shape: **User (mobile OTP) → many Businesses → Subscription per Business** (7-day trial only on first Business) → Document Engine (Data / Template / Document) → server PDF.
4. Locked commercial architecture: **one Core**, two editions — **`SELF_HOSTED`** (install on customer server / license sale) and **`SAAS`** (your shared platform). Never maintain two divergent products.
5. Locked stack: **NestJS** (API) + **Next.js** (web) + **PostgreSQL** + **Redis** + **MongoDB** (+ S3-compatible storage, Chromium PDF workers).
6. On implementation prompts: **analyze → task list → step-by-step**; keep **DB + Backend + Frontend** in sync; end with **`تموم شد`** or **`تموم نشد` + مرحله بعدی**.
7. Cross-cutting issues discovered mid-work → **update `.cursor/rules/` first**, then code.
8. API add/edit/delete → update **`docs/api/`** in the same change.
9. UI: **dark + light** themes; languages **fa + en** (RTL/LTR).

## Rule index

| File | Concern |
| --- | --- |
| `00-agent-mandate.mdc` | How the agent must behave |
| `01-product-domain.mdc` | Product / billing / tenancy laws |
| `02-architecture.mdc` | Stack + layers + bounded contexts (Prisma + official Mongo driver locked) |
| `03-folder-structure.mdc` | Monorepo folders + naming |
| `04-coding-standards.mdc` | NestJS / Next.js quality bar |
| `05-api-security-billing.mdc` | Gates, OTP, payments, security; business context = path `:businessId` |
| `06-delivery-workflow.mdc` | Phases, DoD, git |
| `07-document-editor.mdc` | Editor / renderer constraints |
| `08-dual-deployment.mdc` | SELF_HOSTED vs SAAS — one codebase |
| `09-implementation-prompt-protocol.mdc` | Analyze, tasks, full-stack, status |
| `10-theme-and-i18n.mdc` | Dark/light + fa/en (next-intl locked; theme cookie `vdb-theme`) |
| `11-fonts.mdc` | Font formats, storage keys, PDF embed contract |
| `12-design-themes.mdc` | Document brand tokens vs app chrome dark/light |
| `13-templates-blocks.mdc` | Template PG+Mongo split + core block registry |
| `14-content-entities.mdc` | Corporate content (Projects…) + `module.*` gates |
| `15-audit-events.mdc` | Append-only audit_events for workflow/security |
| `16-backup-restore.mdc` | Business ZIP backup/restore (OWNER, no silent overwrite) |

Phase exit QA: `docs/qa/` + `scripts/e2e/` (phase-01 edition funnels + `phase-02-corporate-acceptance` / `npm run test:e2e:corporate` + `phase-03-professional-acceptance` / `npm run test:e2e:professional`).

If a user request conflicts with these rules, refuse the conflicting part and propose a compliant design.
