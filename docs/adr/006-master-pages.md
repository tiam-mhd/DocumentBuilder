# ADR — Master pages, header/footer, page numbers

## Status

Accepted (P01-T16)

## Context

Print documents need repeating header/footer and page numbers. Editor must preview the same chrome the PDF worker will use.

## Decision

1. **Schema v3** (`@vdb/document-schema`):
   - `masters[]`: `{ id, name, header, footer, pageNumber }`
   - `pages[]`: `{ id, masterId, blocks }` — at least one page
2. **Upgrade:** v2 bodies with top-level `blocks` migrate via `upgradeDocumentLikeInput` → one default master + one page.
3. **Render contract** (`MASTER_RENDER_CONTRACT`): resolve master → header → page body → footer → page number label (`number` | `pageOfTotal`).
4. **Slots:** `headerSlot` / `footerSlot` remain in the flow palette as markers; preview/PDF do not duplicate chrome from slots when a master is assigned.
5. PDF pipeline (T17) must consume this contract — no alternate header model.

## Consequences

- Autosave persists `masters` + `pages` in Mongo `document_bodies` / `template_bodies`.
- Multi-page editing UI can grow later; MVP edits `pages[0]` and previews page 1 of N.
