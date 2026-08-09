# ADR 019 — Content import (Excel/CSV)

## Status

Accepted (Phase 03 — P03-T05)

## Context

Corporate businesses need bulk load of portfolio data (Projects first) without one-by-one UI create. Files may be large enough that sync HTTP is unsafe.

## Decision

1. **Entity MVP:** Projects only (`entityType: projects`), gated by `module.projects` + `@RequireWritable`.
2. **Flow:** upload → parse headers/rows → column mapping → preview (sample + row errors) → commit.
3. **Storage:** temp binary in ObjectStorage at `{businessId}/imports/{importId}/original.{csv|xlsx}`; PG `import_jobs` holds metadata, mapping JSON, preview summary, result summary — not full row payloads.
4. **Formats:** `.csv` (`text/csv` / `text/plain`) via `csv-parse`; `.xlsx` via `exceljs`. First worksheet only for Excel. Max bytes: `IMPORT_MAX_BYTES` (default 5 MiB). Hard row cap: `IMPORT_MAX_ROWS` (default 5000).
5. **Mapping targets (Projects):** `title` (required), `description`, `status`, `category` (match existing category **name**), `location` (match existing location **name**), `titleEn`, `descriptionEn`, optional `year` → `fields.year`.
6. **Commit:** valid rows inserted in one PostgreSQL transaction; invalid rows skipped and listed in `result.errors`. If mapped `title` column missing → reject. Rows with empty title after map → row error.
7. **Async:** if `totalRows > IMPORT_SYNC_MAX_ROWS` (default 100), status → `queued` and BullMQ queue `import.content` processes commit; else sync in request.
8. **Non-goals (MVP):** other entities, auto-create categories/locations, multi-sheet Excel, XLS (legacy), formula evaluation, upsert-by-key.

## Consequences

- UI wizard on Projects page; poll `GET .../imports/:importId` while `queued`/`processing`.
- Extending to Team/etc. reuses the same job table + parsers with a new `entityType` mapper.
