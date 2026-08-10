# ADR 028 — Basic Analytics (views / downloads)

## Status

Accepted (P04-T06)

## Context

Owners need basic stats for public web views and PDF downloads (including share links) without polluting the security audit log or blocking request latency.

## Decision

1. Persist events in PostgreSQL `analytics_events` (separate from `audit_events`).
2. Ingest via BullMQ `analytics.ingest` from public resolve / share file / export download handlers.
3. Store only coarse `country` / `device` — no raw IP/UA.
4. Dashboard aggregates gated by `audit.read` (OWNER/ADMIN).
5. Global opt-out via `ANALYTICS_ENABLED`.

## Consequences

- Share opens counted as `view`/`download` with source `share_*` (ADR 027).
- Future time-series or GeoIP enrichment can extend meta without changing the event table law.
