# Pagination & break rules (ADR 017)

## `breakRules` (per block)

```json
{
  "keepTogether": true,
  "keepWithNext": false,
  "breakBefore": false,
  "breakAfter": false
}
```

## Packer

`paginateDocumentBody(body, opts)` in `@vdb/document-schema`:

- Expands `repeater` cards into atomic units
- Packs by **estimated height** into logical `pages[]`
- Honors `page.autoPaginate` (default true)

## Preview vs PDF

| | Preview | PDF |
| --- | --- | --- |
| Packer | Same estimates | Same estimates |
| Accuracy | Approximate frames | + CSS `break-inside` / `break-before` |
| Measure | No DOM | Chromium may micro-adjust sheets |

TOC page numbers remain logical `pages[]` (ADR 012).
