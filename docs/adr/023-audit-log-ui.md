# ADR 023 — Audit log UI & event catalog

## Status

Accepted (Phase 03 — P03-T09)

## Context

Phase laws require audit of login, business lifecycle, payment, export, and deletes. Workflow already wrote `audit_events`; Owners need a filtered, tenant-safe UI.

## Decision

1. **Catalog:** expand `AuditActions` (shared-types) — see `.cursor/rules/15-audit-events.mdc`.
2. **Writers:** Identity (OTP verify), Tenancy (create/delete), Checkout (payment paid), License (activate), Export (PDF enqueue), Documents (soft-delete); keep workflow writers.
3. **List:** `GET /api/businesses/:businessId/audit-events` — JWT + OWNER/ADMIN; rows for that `businessId` plus member-scoped `auth.login` and install-scoped `billing.license.activated` (`businessId` null). Never other businesses’ rows.
4. **UI:** `/app/audit` — Owner/Admin only; filters + i18n fa/en; theme tokens.
5. **Non-goals:** export of audit CSV, real-time stream, actor impersonation, soft-delete of audit rows.

## Consequences

- Audit append failures must not break primary flows.
- Nav link visible when active membership is OWNER or ADMIN.
