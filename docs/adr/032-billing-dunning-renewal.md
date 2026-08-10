# ADR 032 — Billing Renewal & Dunning

## Status

Accepted (P04-T10)

## Context

Subscriptions have `endsAt` but status was only expired at read-time with no persisted grace, reminders, or SMS. Operators need a daily tick and customers need renew CTAs without data loss.

## Decision

1. Introduce `GRACE_DURATION_DAYS` (default 3): after `endsAt`, effective status is `grace` (writable) until grace ends, then `expired`.
2. BullMQ repeatable job `billing.dunning` (SAAS) persists status transitions and sends idempotent SMS notices.
3. Table `subscription_dunning_notices` prevents duplicate SMS per period.
4. Renewal remains existing checkout; payment success sets `active` + new `endsAt`.
5. Email notifications are out of scope; SMS only via shared `SmsSender`.

## Consequences

- `resolveEffectiveStatus` must include grace (breaking vs prior “past endsAt ⇒ expired” shortcut).
- Tests inject a fake `now` into the dunning tick.
