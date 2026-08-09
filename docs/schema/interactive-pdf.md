# Interactive PDF links (ADR 018)

## Block `link`

```json
{ "kind": "external|email|phone|internal", "target": "…" }
```

Resolved by `resolveBlockLinkHref` → safe `href` or `null`.

## TOC

Entries link to `#h-{blockId}` (same as heading `id`).

## Outline / bookmarks

Playwright Chromium: `page.pdf({ outline: true, tagged: true })` from `h1`–`h3`.
Fake PDF driver does not embed outlines — assert HTML contract in unit tests.
