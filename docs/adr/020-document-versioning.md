# ADR 020 — Document versioning

## Status

Accepted (Phase 03 — P03-T06)

## Context

Authors need immutable snapshots of document bodies (publish milestones and manual checkpoints), restore, and clone — without silently mutating a live published body via editor autosave.

## Decision

1. **PG `document_versions`:** metadata per snapshot — `business_id`, `document_id`, monotonic `version_number`, `source` (`publish`|`manual`), optional `note`, denormalized `title`/`locale`/`status`, `created_by_user_id`, timestamps. Never update rows after create (immutable).
2. **Mongo `document_version_bodies`:** full validated `DocumentBody` copy keyed by `businessId` + `versionId` (+ `documentId`). Filter by `businessId` always.
3. **Create version:**
   - Automatically when document status transitions to `published` (after body/meta write succeeds).
   - Manually via `POST .../documents/:documentId/versions` (`note` optional).
4. **Published body lock:** if PG `status === published`, `PATCH` with `body` is rejected (`DOCUMENT_PUBLISHED_LOCKED`) unless the same request sets `status` to `draft` (unpublish-to-edit) or to `published` only when already handling a publish transition from draft. Pure title/locale/status changes remain allowed.
5. **Restore:** copy version body → current `document_bodies`, set document `status` to `draft`. Versions stay; restore does not delete history.
6. **Clone:** create a **new** document (+ body) from a version snapshot; original unchanged.
7. **Compare (MVP):** metadata/stats diff only (title, locale, status, page/block/master counts, schemaVersion) — not a deep block tree UI.

## Consequences

- Editor must treat published docs as body-readonly until unpublish (draft).
- Export continues to read **current** body; optionally later pin export to a version id (out of MVP).
- Soft-delete document does not hard-delete version rows in MVP (cascade on business/document FK); Mongo version bodies best-effort cleaned with document soft-delete.
