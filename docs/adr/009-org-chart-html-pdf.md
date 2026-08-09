# ADR 009 — Org Chart preview & PDF (HTML/CSS tree)

## Status

Accepted (Phase 02 — P02-T07)

## Context

`module.org_chart` renders a reporting tree from `team_members.parent_member_id`. Editor needs an interactive preview; PDF export must embed the same structure without a separate canvas library.

## Decision

1. **Data:** Reporting edges live on PostgreSQL `team_members.parent_member_id` (same Business). Tree API: `GET .../org-chart/tree` gated by `module.org_chart`.
2. **Block props** (Mongo document/template): `layout` ∈ `tree-vertical` | `tree-horizontal`, optional `rootMemberId`, `showPhotos`, `heightPx`.
3. **Editor / PDF:** Render an **HTML/CSS flex tree** (nested lists). Chromium PDF uses the same markup as the HTML export pipeline — no SVG-only or third-party chart package in MVP.
4. Documents containing `orgChart` blocks require **`module.org_chart`** on body save and PDF enqueue.

## Consequences

- Layouts stay printable and RTL-friendly via CSS (`flex-direction`).
- Drag-and-drop structure editing is deferred; parent is set via form (team PATCH).
