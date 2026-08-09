# ADR 008 — Map block PDF strategy (static image)

## Status

Accepted (P02-T06)

## Context

Interactive maps in the editor use **Leaflet + OSM tiles**. Chromium PDF export must not depend on a live tile session or Leaflet JS in the print path. Map settings and markers still come from document JSON + `locations` (same Business).

## Decision

1. **Editor / preview (Next.js):** Leaflet map (client component). Markers from `GET .../map/markers` (`module.map`).
2. **PDF / export HTML:** Embed a **static map `<img>`** built from block props + resolved marker lat/lng:
   - Default provider URL template (OpenStreetMap staticmap-style): center, zoom, size, markers query params.
   - Configurable via `MAP_STATIC_URL_TEMPLATE` (optional). Empty / `none` → render a labeled placeholder box (CI/`PDF_RENDERER=fake` friendly).
3. Do **not** invent a second geography store. Markers always resolve through `locations`.
4. Documents containing `map` blocks require entitlement **`module.map`** on body save and on PDF enqueue.

## Consequences

- Offline/fake workers stay green without external map HTTP.
- Production PDF quality depends on the static provider availability; can swap template without schema change.
- Future: optional pre-render to object storage (`exports/{jobId}/map-{blockId}.png`) if static CDN is blocked.

## Related

- `.cursor/rules/14-content-entities.mdc` (Map Engine)
- `docs/adr/007-pdf-export-pipeline.md`
