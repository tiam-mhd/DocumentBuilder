# ADR — Flow editor shell & autosave

## Status

Accepted (P01-T15)

## Context

Documents need an interactive editor without generating PDF on every keystroke. Layout is flow-based (not free canvas).

## Decision

1. **Client store:** Zustand in `features/editor` with past/future stacks for undo/redo.
2. **Reorder:** `@dnd-kit/sortable` vertical list for **top-level** blocks only — no absolute x/y.
3. **Autosave:** debounce **800ms** → `PATCH /businesses/:businessId/documents/:documentId` with full validated body. Never enqueue PDF from the editor keystroke path.
4. **Preview:** HTML/CSS using Business default **design theme** tokens (document brand), separate from app chrome dark/light.
5. **Gates:** UI disabled when subscription not writable; API EntitlementGuard still enforces.
6. **Redis edit lock:** deferred — single-tab autosave is enough for Phase 01.

## Consequences

- Master header/footer slots render as placeholders until T16.
- Export pipeline (T17) remains a separate queued job.
