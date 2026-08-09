# ADR — Document soft-delete and create-from-template

## Status

Accepted (P01-T14)

## Context

Documents are instances: template structure snapshot + optional `dataRefs` + page config. Bodies are flexible JSON validated by `@vdb/document-schema`.

## Decision

1. **PG** `documents`: `business_id`, `title`, `status` (`draft`|`published`), `template_id`, `deleted_at`.
2. **Mongo** `document_bodies`: `businessId` + `documentId` unique; includes `dataRefs` (Business Data pointers — never company content inside templates).
3. **Create:** require `templateId`; copy template `page`/`blocks` into document body with new block ids. Later template edits do not rewrite existing documents.
4. **Delete:** soft-delete PG row; delete Mongo body (same as templates). Recycle bin is out of MVP.

## Consequences

- Editor (T15) mutates Mongo body via PATCH with schema validation.
- Export/PDF resolve theme via document → template → `theme_id` or business default.
