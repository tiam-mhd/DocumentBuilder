# ADR 013 — Collection repeater + basic `{{item.*}}` binding

## Status

Accepted (Phase 02 — P02-T11)

## Context

Templates need to loop Business collections (projects, team, …) into card layouts. Advanced formulas/filters belong to Phase 03.

## Decision

1. **Block type `repeater`** is **core** (`allowsChildren: true`). Props: `source`, `limit`, `emptyMessage`. Children = one card template.
2. **Sources (MVP):** `projects` | `teamMembers` | `branches` | `services` | `clients` | `certificates` | `timelineEvents`.
3. **Gates:** Saving/exporting a body with `source: projects` requires `module.projects`; `timelineEvents` requires `module.timeline`. Other sources are foundational (membership / writable only).
4. **Binding:** In child string props (`text.content`, `section.title`, `image.alt`, `qr.value`/`caption`), replace `{{item.<key>}}` with flat string values from the collection item. Unknown keys → empty string. No filters/formulas.
5. **Data load:** `GET /api/businesses/:businessId/collections/:source` (+ export worker resolve). Preview and PDF share the same expansion.

## Consequences

- Nested repeaters are unsupported in MVP (fail-safe: inner repeater renders empty/placeholder).
- Phase 03 may add `{{business.*}}` and formulas without changing the `repeater` node shape.
