# ADR 034 — Password + 2FA login & Parsgreen SMS

## Status

Accepted

## Context

Product law originally locked auth to mobile OTP only. Operators need optional password login and optional two-factor (password then OTP). SMS delivery for production uses Parsgreen REST Apiv2.

## Decision

1. **Methods:** OTP always; password when `users.password_hash` set; if `two_factor_enabled`, password login returns a Redis `challengeToken` and requires `POST /auth/2fa/verify` with OTP (never JWT after password alone).
2. **Hashing:** Node `scrypt` encoded string on `users.password_hash` — never bcrypt dependency; never return hash in `PublicUser`.
3. **SMS:** `SMS_PROVIDER=fake|parsgreen`. Parsgreen uses `POST {PARSGREEN_BASE_URL}/Apiv2/Message/SendOtp` with `Authorization: basic apikey:{PARSGREEN_API_TOKEN}` and body `{ Mobile, SmsCode, AddName }`. Empty token → `SMS_MISCONFIGURED` on send (boot OK).
4. **UX:** Single `/login` wizard with animated steps — see `.cursor/rules/27-auth-login-ux.mdc`.

## Consequences

- `.env` must document `PARSGREEN_API_TOKEN` (empty until deploy).
- Fake provider still returns `devCode` in development for local QA.
- Enabling 2FA requires a password first.
