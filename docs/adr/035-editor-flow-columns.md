# ADR 035 — Flow columns (row / column blocks)

## Status

Accepted (P05-T00-02 — page-builder foundation)

## Context

The document editor must feel as flexible as a professional page builder (Elementor-class) while remaining inside VDB laws: **Data ≠ Template ≠ Document**, **flow layout**, no absolute free-canvas (`07-document-editor.mdc`, `29-editor-pagebuilder-ux.mdc`).

Users need side-by-side content (text beside image, two articles, etc.) that:

- Round-trips through Mongo body validation
- Renders consistently in HTML preview and final PDF
- Participates in smart pagination (ADR 017)
- Supports editor DnD into/between columns (implementation in pack phase 05)

### Options considered

| Option | Idea | Pros | Cons |
| --- | --- | --- | --- |
| **A** | New core blocks `row` + `column` | Clear Layers tree; DnD targets obvious; does not overload `section` TOC semantics | Two new types; nesting rules to document |
| **B** | Extend `section` with `props.layout = stack\|columns` + `columnWidths` | Fewer types | Mixes “titled section / TOC source” with layout chrome; awkward children partitioning; harder DnD UX |
| **C** | CSS-grid props on arbitrary blocks | Flexible | Ambiguous tree; PDF parity hard; drifts toward free layout |

**Choice: A.**

Reject B: `section` already carries `title` / heading semantics for TOC (ADR 012); layout chrome should be a separate structural node.  
Reject C: too close to unconstrained layout and weak PDF guarantees.

## Decision

### 1. Block types (core, `moduleCode: null`)

| Type | Role | Children |
| --- | --- | --- |
| `row` | Horizontal flow band | **Only** `column` nodes (1–4 in MVP) |
| `column` | Vertical flow cell inside a row | Normal flow blocks (`text`, `image`, `section`, `divider`, modules, …) — **not** `row` in MVP |

- `row` / `column` are registered in `CORE_BLOCK_TYPES` / `BLOCK_REGISTRY` at implementation (pack `P05-T05-01`).
- Unknown / legacy bodies without these types keep working.

### 2. Width model (MVP)

- Each `column` has `props.widthFraction: number` in `(0, 1]` (stored JSON number).
- At validate time: sum of fractions across siblings in a `row` must equal `1` within epsilon `0.01`; otherwise reject write (`TEMPLATE_INVALID_BODY` / document invalid body codes as used today).
- Editor presets normalize to exact sums (e.g. `0.5+0.5`, `0.333+0.334+0.333` via preset factories that write canonical values).
- **No** breakpoint-specific width maps in this ADR (no Elementor-style mobile/tablet columns).

### 3. Nesting limits (MVP)

| Rule | MVP |
| --- | --- |
| `row` → children | only `column` |
| `column` → children | any block **except** `row` and `column` |
| `row` inside `column` | **forbidden** (no nested rows) |
| `column` outside `row` | **forbidden** |
| Max columns per row | **4** |
| Min columns per row | **1** (presets usually 2+) |

Future ADR may allow one nested row level; do not implement without that ADR.

### 4. RTL / LTR

- Column **order** in the tree is logical start→end.
- HTML/PDF: `dir` from `document.locale` (ADR 015); flex/grid `direction` follows that `dir` so the first `column` appears on the **inline-start** side (right in `fa` RTL, left in `en` LTR).
- Do not mirror fractions; fractions always apply to logical columns in tree order.

### 5. Pagination (ADR 017 coexistence)

- A `row` is a single **flow unit** for packing when `breakRules.keepTogether` is true (default for `row`: **`keepTogether: true`**).
- Estimated height of a `row` ≈ **max**(estimated heights of its columns), not the sum of columns (side-by-side).
- Packer must not split a keep-together `row` across logical pages; if it does not fit, move the whole row to the next page (same as other atomic units).
- `breakBefore` / `breakAfter` on `row` are allowed; avoid putting break rules on `column` as page-split signals in MVP (columns are not top-level flow units).
- CSS defense for PDF: `break-inside: avoid` on the row wrapper when keep-together is set.

### 6. Renderer contract

- HTML preview and PDF HTML **must** share the same structural mapping: `row` → flex/grid row; `column` → flex child with `flex-grow` / `width` from `widthFraction`.
- Prefer one shared helper (schema or render util) over divergent Next-only markup.
- Fail-safe: if a corrupt `row` fails validation it never persists; if an older worker sees unknown types, skip/placeholder per existing unknown-block policy — never crash the worker.

### 7. Editor (implementation phases — not this ADR’s code)

- Palette: insert `row` (default 2 columns 50/50).
- Canvas: columns are droppable + sortable vertically inside; blocks may move between columns.
- Inspector: row → column count / width presets; column → rarely needs width override beyond presets.
- Layers: `row` → `column` → children tree.

### 8. Schema version

- Adding `row` / `column` is **additive** for existing `schemaVersion: 3` documents (old bodies omit the types).
- **No mandatory bump** of `DOCUMENT_SCHEMA_VERSION` solely for these types, provided:
  - Zod enums accept the new types, and
  - reads of v3 bodies without rows remain valid.
- If implementation instead gates “columns require v4”, that must be a deliberate follow-up ADR; default path is **stay on v3 + additive types**.

Implementation must still update `13-templates-blocks.mdc` core type table when code lands (`P05-T05-01`).

## Non-goals

- Absolute x/y positioning, free overlap, rotate/resize handles on a canvas
- Elementor-style responsive breakpoints (mobile/tablet column stacks) in this ADR
- Nested rows / columns-in-columns
- Per-column background absolute layers unrelated to flow (future design tokens only if additive props + PDF parity)
- “Web width preview” for public web publish as a second layout engine — **future** optional note only; print/PDF page remains authoritative for this ADR

## Consequences

- Page-builder pack phase **05** implements schema → editor → preview/PDF parity → presets → keep-together UX under this contract.
- Rule `29-editor-pagebuilder-ux.mdc` treats this ADR as **Accepted** — columns work may proceed.
- ADR 017 packer and HTML/PDF renderers gain an explicit row height rule (max of columns).
- TOC (ADR 012) continues to ignore pure layout nodes: `row`/`column` are not heading sources; headings inside columns still count.
