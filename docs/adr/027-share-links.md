# ADR 027 — Document Share Links

## Status

Accepted (P04-T05)

## Context

Customers need time-limited or password-protected links for a document (HTML view or PDF download) without making a permanent public SEO slug (`web_published`).

## Decision

1. Store share links in PostgreSQL `document_share_links` with **hashed** tokens (and optional password hashes).
2. Scopes: `web` (HTML via shared renderer) and `pdf` (Chromium/fake PDF buffer).
3. Soft-revoke via `revoked_at`; optional `expires_at`.
4. Rate-limit password attempts in Redis.
5. Mutate APIs require `documents.publish` + writable; create only for approved/published documents.
6. Independent of Web Publish slug (ADR 026).

## Consequences

- Analytics (P04-T06) counts share opens via separate `analytics_events` (ADR 028) — not audit.
- Invitations still use plaintext tokens historically; share links must not copy that pattern.
