# ADR — Document brand themes vs app chrome

## Status

Accepted (P01-T12)

## Context

The product needs Business-scoped brand tokens (colors, typography, font face refs) for documents and PDF. Separately, the Next.js app supports dark/light chrome via cookie `vdb-theme`.

## Decision

1. Store brand themes in PostgreSQL `design_themes` with JSONB `tokens` validated by `@vdb/shared-types` (`DesignThemeTokens`).
2. Seed one `is_default` theme on Business create (composite `BUSINESS_CREATED_HOOK` with subscription trial hook).
3. Optional `fonts.headingFontFaceId` / `bodyFontFaceId` reference `font_faces` in the same Business.
4. Do **not** use MongoDB for themes.
5. App dark/light remains `10-theme-and-i18n.mdc`; brand themes are `12-design-themes.mdc`.

## Consequences

- Template/Document/PDF resolve brand tokens from PG, not from the UI theme cookie.
- Theme settings UI preview is HTML/CSS only (no PDF on keystroke).
