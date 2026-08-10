# ADR 036 — Editor PDF preview (queued, distinct from final export)

## Status

Accepted (P05-T00-03 — page-builder foundation)

## Context

Page-builder UX (`29-editor-pagebuilder-ux.mdc`) requires mode `pdfPreview`: users must **see** a PDF before publish/download with confidence. ADR 007 already defines **final** PDF via BullMQ + Chromium and forbids PDF on editor keystrokes.

We need a second product surface that:

- Reuses the same HTML→PDF fidelity as final export
- Is explicitly user-triggered (never autosave/DnD/keystroke)
- Has clearer copy and softer gates than final download
- Is cost-capped so preview spam cannot starve final exports

## Decision

### 1. Same renderer, distinct purpose

- Preview uses the **same** `DocumentHtmlRenderer` + `PDF_RENDERER` (`fake` \| `playwright`) path as final export (ADR 007).
- Do **not** introduce client-side jsPDF (or similar) as the primary preview engine.
- Optional **draft watermark**: inject a non-destructive HTML overlay (“پیش‌نمایش” / “Preview”) when document `status === 'draft'` **or** always for `purpose=preview` jobs — **Decision: watermark all preview PDFs** (simple, honest, avoids confusing preview with final download). Final export jobs never get this watermark.

### 2. Persist on `export_jobs` with `purpose`

Reuse PG `export_jobs` (ADR 007) rather than a parallel table:

| Field (additive migration at implement time) | Values |
| --- | --- |
| `purpose` | `final` (default for existing rows) \| `preview` |
| `bodyHash` (optional nullable) | short hash of validated body (+ page config) used for reuse |
| `expiresAt` (optional nullable) | preview object TTL hint |

- **Storage key (preview):** `{businessId}/export-previews/{jobId}/document.pdf`
- **Storage key (final):** unchanged `{businessId}/exports/{jobId}/document.pdf`

Indexes: keep `(businessId, documentId, createdAt)`; add `(businessId, purpose, status, createdAt)` when implementing.

### 3. Queue & worker fairness

- Same BullMQ queue name `export.pdf` with payload flag `purpose: 'preview' | 'final'`.
- **Do not** give preview higher priority than final.
- Cap **in-flight preview** separately so previews cannot fill the entire per-business concurrency budget:

| Env | Role | Suggested default |
| --- | --- | --- |
| `EXPORT_PREVIEW_RATE_MAX` | Max preview enqueues per business per window | `6` |
| `EXPORT_PREVIEW_RATE_WINDOW_SECONDS` | Window length | `60` |
| `EXPORT_PREVIEW_MAX_CONCURRENT_PER_BUSINESS` | `queued`+`processing` preview jobs | `1` |
| Existing `EXPORT_*` | Final export caps (unchanged) | as today |

Worker `EXPORT_WORKER_CONCURRENCY` remains global; when choosing work, prefer not to start a preview if the business already has a final job processing and preview concurrent cap is saturated (implementation detail in phase 07).

### 4. Authorization & workflow (ADR 021)

| Action | Gate |
| --- | --- |
| **Enqueue / view preview** | JWT + business **membership** + document in that business. **Writable subscription not required** (VIEWER may preview). Body lock does not block preview. |
| **Final export download** | Unchanged: entitlement `export.pdf` + document status in allowed export set (approved/published per existing rules) |

Preview allowed for statuses: `draft` \| `review` \| `approved` \| `published` (and any other readable non-deleted status the product already exposes). Soft-gate “please preview before publish” is UX (phase 07); hard-gate only if a later change adds server enforce.

### 5. TTL & cleanup

- Preview files are ephemeral: default **TTL 24h** from `finishedAt` (`EXPORT_PREVIEW_TTL_HOURS=24`).
- Implementation: mark `expiresAt`; periodic job or lazy delete on next enqueue for that document’s old previews.
- Final exports retain existing retention policy (not redefined here).

### 6. Idempotent reuse (product)

When enqueueing preview:

1. Compute `bodyHash` from last saved validated Mongo body (+ `page` config + locale + theme ids used in render).
2. If a `completed` preview job exists for same `(businessId, documentId, bodyHash)` and not expired → **return that job** (no new Chromium work).
3. If body changed since last preview → UI shows stale; new enqueue creates a new job.

MVP may skip hash and always enqueue; **preferred** is hash reuse to cut cost. Document the chosen behavior in OpenAPI at implement time.

### 7. UX contract (API consumers)

Job status machine: same as final — `queued` → `processing` → `completed` \| `failed`.

Editor:

- Enqueue **only** on explicit user action in `pdfPreview` mode (or “Refresh preview”).
- Poll status; fetch file via authenticated GET; revoke blob URLs on unmount.
- Never enqueue from autosave.

### 8. Proposed HTTP shape (implement in P05-T07-01; not in this ADR task)

All under `/api/businesses/:businessId/documents/:documentId` (JWT + membership):

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `.../export/pdf-preview` | Enqueue or reuse preview job → `{ data: PublicExportJob }` |
| `GET` | `.../exports/:jobId` | Status (must verify `businessId` + job belongs to document; allow `purpose=preview`) |
| `GET` | `.../exports/:jobId/file` | PDF bytes (same IDOR rules) |

Alternatively reuse existing export GET routes if they already scope by business; preview POST must be a **distinct** path from `POST .../export/pdf` so entitlement/status rules stay clear.

Suggested error codes:

| Code | When |
| --- | --- |
| `EXPORT_PREVIEW_RATE_LIMITED` | Redis preview rate exceeded |
| `EXPORT_PREVIEW_CONCURRENCY` | Too many in-flight previews for business |
| `EXPORT_JOB_NOT_FOUND` | IDOR / missing |
| `DOCUMENT_NOT_FOUND` | Wrong business/document |
| `EXPORT_PREVIEW_FAILED` | Worker failed (plus job.errorCode) |

Final export keeps existing entitlement denial codes.

## Non-goals

- PDF render on every keystroke, websocket push, or autosave
- Client-side jsPDF as the source of truth
- DOCX/PPTX preview
- Public unauthenticated preview URLs (use share links ADR 027 if sharing is needed)
- Changing final-export approval rules in this ADR

## Consequences

- Phase 07 of `05-editor-pagebuilder` implements migration (`purpose`), routes, rate keys, UI mode, and workflow soft-gate.
- Rule `29` treats ADR 036 as **Accepted**.
- Hardening rule 26 gains preview-specific knobs alongside `EXPORT_*`.
- Cost: watermark + separate storage prefix makes misuse and cleanup easier to reason about.
- `.env.example` documents preview knobs as placeholders until Nest `env.validation` wires them in phase 07.
