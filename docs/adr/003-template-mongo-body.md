# ADR — Template body in MongoDB

## Status

Accepted (P01-T13)

## Context

Templates need a flexible page/block tree. Architecture locks Mongo for document payloads; PostgreSQL for tenancy metadata.

## Decision

1. **PG** `document_templates`: `business_id`, `name`, optional `theme_id`, soft-delete.
2. **Mongo** `template_bodies`: validated `TemplateBody` (`@vdb/document-schema` v2) with required `businessId` + `templateId`. Unique index `(businessId, templateId)`.
3. Core blocks: `text`, `image`, `section`, `divider`, `headerSlot`, `footerSlot` — registry in code; module blocks later.
4. Templates never store Business entity data (Data ≠ Template ≠ Document).

## Consequences

- CRUD must write both stores (or roll back PG on Mongo failure).
- Document instances (T14) will reference `templateId` and keep their own Mongo body.
