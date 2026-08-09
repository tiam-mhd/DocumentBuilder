# ADR 010 — Timeline preview & PDF (HTML/CSS)

## Status

Accepted (Phase 02 — P02-T08)

## Context

`module.timeline` shows company events from PostgreSQL `timeline_events`. Editor and PDF need a printable layout without a separate chart library.

## Decision

1. **Data:** Events in PG (`occurred_at`, `title`, `body`, optional `media_id`, `fields`) scoped by `businessId`.
2. **Block props:** `layout` ∈ `vertical` | `alternating`, `limit`, `heightPx`.
3. **Editor / PDF:** Render an **HTML/CSS timeline** (ordered list + rail). Chromium PDF uses the same markup as export HTML.
4. Documents containing `timeline` blocks require **`module.timeline`** on body save and PDF enqueue.

## Consequences

- Alternating layout uses even/odd CSS classes (RTL-friendly via logical properties where practical).
- Media ids are references only; PDF may show a placeholder caption until a shared media URL helper exists.
