# ADR 018 — Interactive PDF (links + outline)

## Status

Accepted (Phase 03 — P03-T04)

## Context

Corporate PDFs need clickable links (external / email / phone / in-doc anchors) and a bookmark outline. Export already uses Chromium via Playwright.

## Decision

1. **Block `link`** (optional on any flow block): `{ kind, target }`
   - `external` → `https?://…` (scheme required or prefixed with `https://`)
   - `email` → `mailto:`
   - `phone` → `tel:`
   - `internal` → `#h-{blockId}` (same id as heading/section anchors)
2. **HTML/PDF:** render `<a href="…">` around linked content. TOC entries are `<a href="#h-{entry.id}">`.
3. **PDF outline/bookmarks:** Playwright `page.pdf({ outline: true, tagged: true })` — Chromium builds the outline from **heading elements** (`h1`–`h3`). Authors should mark TOC sources with `headingLevel`.
4. **Document metadata:** HTML `<title>` (already) + Playwright/PDF uses document title; optional `lang`/`dir` on `<html>`.
5. **Fake PDF driver:** does not embed real link annotations or outlines — unit tests assert **HTML** link/href contract; outline flag is asserted on Playwright renderer options.
6. **Non-goals:** custom PDF JS actions, form fields, tracked short URLs, pdf-lib outline post-process (unless Chromium outline proves unreliable later).

## Consequences

- Preview mirrors `<a>` for author feedback (new tab for external).
- Internal links jump within the multi-page HTML PDF when Chromium resolves named destinations / fragment ids across pages.
- If a host Chromium build omits outline despite flags, treat as environment issue; ADR remains the product contract.
