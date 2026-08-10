# ADR 029 — Template Marketplace Skeleton

## Status

Accepted (P04-T07)

## Context

SAAS needs a global template catalog and install-into-Business flow. Self-hosted must not expose cross-customer marketplace. Full template commerce is not funded.

## Decision

1. Platform table `marketplace_templates` (slug, locale, body JSON, active/sort).
2. Install copies into tenant `document_templates` + Mongo `template_bodies` (snapshot).
3. Hard edition gate: SAAS only; public config flag `templateMarketplace`.
4. Entitlement `marketplace.templates` gates browse/install access.
5. **Non-goal:** per-template payments, seller listings, ratings, payouts.

## Consequences

- SELF_HOSTED builds stay green with routes rejecting non-SAAS.
- Future paid template SKUs require a new ADR reversing the payment non-goal.
