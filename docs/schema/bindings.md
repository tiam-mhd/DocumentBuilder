# Safe bindings (ADR 016)

Placeholders in string block props (`content`, `title`, `alt`, `value`, `caption`, `emptyMessage`) are resolved by `@vdb/document-schema` for **preview and PDF**.

## Allowed (whitelist)

```text
{{business.name}}
{{item.<key>}}
{{count(<source>)}}
{{count(<source> where <field>=<value>)}}
```

- `<source>` ∈ `projects` | `teamMembers` | `branches` | `services` | `clients` | `certificates` | `timelineEvents`
- No `eval`, formulas beyond `count`, or nested calls
- Invalid → empty string

## Catalog

`BINDING_CATALOG` in `@vdb/document-schema` — editor insert UI.

## API

Collection data: `GET /api/businesses/:businessId/collections/:source?locale=`
