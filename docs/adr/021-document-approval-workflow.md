# ADR 021 — Document approval workflow (basic)

## Status

Accepted (Phase 03 — P03-T07)

## Context

Corporate documents need a simple review gate before final publish/PDF. Full invite-based reviewers are Phase 04; MVP uses existing membership roles.

## Decision

### States (`documents.status`)

`draft` → `review` → `approved` → `published`

(Plus reject/unpublish/reopen back to `draft`.)

### Transitions (server-enforced)

| Action | From | To | Who (membership) |
| --- | --- | --- | --- |
| `submit` | draft | review | any writable member |
| `approve` | review | approved | **OWNER** or **ADMIN** |
| `reject` | review | draft | OWNER or ADMIN |
| `publish` | approved | published | OWNER or ADMIN |
| `unpublish` | published | draft | OWNER or ADMIN |
| `reopen` | approved | draft | OWNER or ADMIN |

API: `POST /api/businesses/:businessId/documents/:documentId/workflow/{submit|approve|reject|publish|unpublish|reopen}`.

Do **not** set workflow statuses via free-form `PATCH ... status` (returns `DOCUMENT_WORKFLOW_REQUIRED`).

### Body lock

While status ∈ `{review, approved, published}`, body PATCH is locked (`DOCUMENT_PUBLISHED_LOCKED` / same lock family). Only `draft` is editable. Aligns with ADR 020 versioning: publish still creates an immutable version snapshot.

### Final PDF export

`POST .../export/pdf` allowed only when status ∈ `{approved, published}`. Otherwise `DOCUMENT_NOT_APPROVED_FOR_EXPORT`. Preview HTML remains unrestricted for members.

### Audit

Each transition writes an `audit_events` row (`action`, `businessId`, `userId`, `entityType=document`, `entityId`, `meta` with from/to/note).

### Non-goals (Phase 04+)

External invitee reviewers, multi-step parallel approvals, email notifications, per-document assignee.

## Consequences

- Creator businesses (OWNER) can self-approve; EDITOR authors submit and wait.
- Editor UI shows workflow buttons by role + status; documents list mirrors status labels.
