# ADR 015 — Document content locale vs UI chrome i18n

## Status

Accepted (Phase 03 — P03-T01)

## Context

Business content (projects, team, …) and document/PDF output need FA/EN. App chrome already uses next-intl (`fa`/`en`) — that must stay separate from **document language**.

## Decision

1. **UI chrome i18n** remains next-intl + cookie/layout `dir` (rule `10-theme-and-i18n.mdc`).
2. **Document locale** is first-class: PostgreSQL `documents.locale` (`fa` | `en`, default `fa`) mirrored on Mongo `DocumentBody.locale` for editor autosave.
3. **Entity translations:** JSONB column `translations` on key content tables. Shape:
   `{ "en": { "title": "…", "description": "…" }, … }`
4. **Canonical columns** hold the **default content locale = `fa`**. Other locales live only under `translations.<locale>`.
5. **Resolve:** `pickLocalized(base, translations, locale, fields)` — for `fa` use columns; for other locales use translation field with **fallback to column**.
6. **Export / HTML preview:** `dir` + `lang` from document locale (`fa` → `rtl`, `en` → `ltr`). Collections/repeater load with the same locale.
7. **MVP tables with `translations`:** `projects`, `project_categories`, `team_members`, `branches`, `business_services`, `clients`, `certificates`, `timeline_events`.
8. Non-goal this task: per-block bilingual text trees, machine translation, or more than `fa`/`en`.

## Consequences

- Collection API accepts `?locale=fa|en`.
- Editor exposes a document-locale switch (persisted via document PATCH).
- Content UIs edit FA columns + EN translation map for key string fields.
