# ADR 012 — Auto TOC and page numbers

## Status

Accepted (Phase 02 — P02-T10)

## Context

Documents need an automatic table of contents from headings/sections with page numbers in preview and PDF. Chromium print pagination can split a single logical page across multiple PDF sheets.

## Decision

1. **Block type `toc`** is **core** (`moduleCode: null`).
2. **TOC sources** (document-schema `buildTableOfContents`):
   - `section` with non-empty `title` → level = `props.headingLevel` (1–3, default **1**)
   - `text` with `props.headingLevel` ∈ {1,2,3} → title = trimmed `content`
   - Walk pages in order, then blocks depth-first; skip nested content inside other TOC sources only by continuing into `section.children`
   - Ignore `toc` blocks when scanning
3. **Page number** on each entry = **1-based index in `DocumentBody.pages[]`** (same logical page as master page numbers). Not CSS/print-break sheet index.
4. Preview and PDF both call `buildTableOfContents` — no two-pass layout engine in MVP.
5. **Limitation (locked):** Accurate “PDF sheet” numbers after automatic print reflow are **out of scope** until a two-pass measure pipeline exists. TOC numbers match logical document pages.

## Consequences

- Multi-page documents (`pages.length > 1`) get meaningful TOC page numbers today.
- Single-page MVP still shows page `1` for all entries.
- Authors mark headings via `headingLevel` on section/text in the inspector.
