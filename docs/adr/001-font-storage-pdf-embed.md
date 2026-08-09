# ADR — Font storage keys for PDF embed

## Status

Accepted (P01-T11)

## Context

PDF export must embed Business-registered fonts (RTL-safe). Font binaries live in object storage alongside media, not MongoDB.

## Decision

1. **Formats:** `woff2`, `ttf`, `otf` only (see `.cursor/rules/11-fonts.mdc`).
2. **Metadata:** PostgreSQL `font_faces` scoped by `business_id`.
3. **Object key:**

```text
{businessId}/fonts/{fontId}/original.{ext}
```

4. **PDF / export worker** loads bytes with the shared ObjectStorage adapter (`STORAGE_DRIVER` / S3 or local root) using `storage_key` from PG — same credentials as the API process. Do not rely on a public URL.
5. **Optional HTTP:** `GET /api/businesses/:businessId/fonts/:fontId/file` (JWT + membership) for UI preview and tooling; response includes `X-VDB-Storage-Key` for debugging.

## Consequences

- Workers need DB + storage access (not browser cookies).
- Soft-delete removes the object; Theme/PDF must ignore deleted faces.
