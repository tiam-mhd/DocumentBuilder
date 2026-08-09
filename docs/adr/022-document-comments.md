# ADR 022 — Document comments

## Status

Accepted (Phase 03 — P03-T08)

## Context

Reviewers and authors need threaded-light feedback anchored to a document page and/or block without mutating the document body.

## Decision

1. **Store:** PostgreSQL `document_comments` — always `business_id` + `document_id`; soft-delete via `deleted_at`.
2. **Fields:** `body` (plain text, max 4000), optional `page_id`, optional `block_id` (element anchor), `author_user_id`, `resolved_at` / `resolved_by_user_id`.
3. **API:** under `/api/businesses/:businessId/documents/:documentId/comments` — list / create / patch body / resolve / unresolve / delete.
4. **Gates:** list = membership; create/resolve/unresolve/patch/delete = `@RequireWritable`. Delete/patch body = **author** or **OWNER/ADMIN**. Comments remain allowed while document status is review/approved (body lock does not block comments).
5. **Non-goals:** `@mention` parsing/notifications, rich text, replies/threads, real-time presence, PDF annotation export.

## Consequences

- Editor shows a comments panel; selecting a block can prefill `blockId`.
- Orphan anchors (deleted blocks) stay valid historically — UI shows “missing block” hint.
