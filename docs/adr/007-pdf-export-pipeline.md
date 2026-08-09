# ADR — PDF export via BullMQ + Chromium

## Status

Accepted (P01-T17)

## Context

Final PDF must not run on editor keystrokes. Fonts live in ObjectStorage; document bodies in Mongo; brand tokens in PG.

## Decision

1. **PG** `export_jobs` tracks status (`queued` → `processing` → `completed`|`failed`).
2. **Redis/BullMQ** queue name `export.pdf`; worker may run inside Nest API process (Phase 01) or a dedicated worker later.
3. **Canonical HTML** from `DocumentHtmlRenderer` (master contract + RTL + `@font-face` data URLs from ObjectStorage).
4. **PDF renderer port:** `PDF_RENDERER=fake|playwright` — fake for CI/dev without Chromium; playwright for production (install browsers on the worker image).
5. **Storage key:** `{businessId}/exports/{jobId}/document.pdf`
6. **Gate:** `POST .../export/pdf` requires `@RequireEntitlement('export.pdf')`.

## Consequences

- Editor only enqueues; download via authenticated `GET .../exports/:jobId/file`.
- Geo-restricted Playwright browser downloads must be handled in Docker build (pre-bake Chromium).
