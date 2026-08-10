# ADR 033 — Pre-GA performance & security hardening

## Status

Accepted (P04-T11)

## Context

Before GA we need concrete baselines for HTTP hardening, export cost control, and Redis rate limits already implied by the security checklist but not fully wired for PDF enqueue.

## Decision

1. Enable **Helmet** + keep CORS origin allowlist; optional `TRUST_PROXY`.
2. Enforce `EXPORT_MAX_CONCURRENT_PER_BUSINESS` on enqueue (count `queued`+`processing`).
3. Redis rate-limit PDF enqueue per business (`EXPORT_RATE_*`).
4. Configurable BullMQ worker concurrency for export.
5. Document gaps/fixes in `docs/qa/pre-ga-hardening.md`.

## Consequences

- Heavy export abuse is throttled before queue blow-up.
- Operators must set `CORS_ORIGINS` / `TRUST_PROXY` correctly behind reverse proxies.
