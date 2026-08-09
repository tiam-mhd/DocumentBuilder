# ADR 016 — Safe advanced data binding (no eval)

## Status

Accepted (Phase 03 — P03-T02)

## Context

Default masters already embed `{{business.name}}`, but Phase 02 only resolved `{{item.*}}` inside repeaters. Product needs business fields plus simple `count` / `where` formulas for preview and PDF — without arbitrary code execution.

## Decision

1. **Shared resolver** lives in `@vdb/document-schema` (`applyBindings` / `parseBindingExpression`). Nest export and Next preview call the **same** functions.
2. **No `eval` / `Function` / dynamic `import`**. Expressions are parsed with a whitelist grammar only.
3. **Allowed expressions (locked MVP):**

| Form | Meaning |
| --- | --- |
| `{{business.name}}` | Active Business display name |
| `{{item.<key>}}` | Repeater card field (ADR 013) |
| `{{count(<source>)}}` | Collection row count (`REPEATER_SOURCES`) |
| `{{count(<source> where <field>=<value>)}}` | Count items whose flat `values[field]` equals `value` |

4. **Identifiers:** `[a-zA-Z][a-zA-Z0-9_]*` only. Where **values** are unquoted identifiers or single-quoted strings (`[a-zA-Z0-9_.-]+` inside quotes). Max raw expression length: **120** chars.
5. **Unknown / invalid** placeholders resolve to **empty string** (fail-safe; never throw from renderer).
6. **Allowed `count` sources:** exactly `REPEATER_SOURCES`. Module gates unchanged when the document also contains gated repeaters; `count(projects)` alone does **not** invent a new entitlement — reading collection totals uses the same membership + module checks as `GET .../collections/:source`.
7. **Catalog:** `BINDING_CATALOG` in document-schema drives editor insert UI (fa/en labels via i18n keys).
8. **Non-goals:** arithmetic, nested functions, AND/OR, JS expressions, cross-business refs, writing to data via bindings.

## Consequences

- Export builds a `BindingContext` (`business` + collection items/totals + optional `item`) before HTML.
- Preview builds the same shape client-side from active Business + collection fetches.
- ADR 013 `{{item.*}}` remains; formulas extend the placeholder engine.
