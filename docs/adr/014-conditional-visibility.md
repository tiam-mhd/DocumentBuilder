# ADR 014 — Basic block conditional visibility

## Status

Accepted (Phase 02 — P02-T12)

## Context

Documents should hide blocks when Business data is missing (e.g. certificates section when the collection is empty). A full enterprise rule engine belongs to later phases.

## Decision

1. Optional `when` on every `BlockNode` (additive; schema version stays **v3**).
2. Locked operators: `exists` | `empty` | `eq` only.
3. Locked MVP paths: `collection.<RepeaterSource>` resolving to the **item count** for that Business collection (same sources as ADR 013).
4. Evaluation at **render time** (editor HTML preview + PDF HTML). Missing/`null` `when` → always visible.
5. Semantics:
   - `exists` → count > 0
   - `empty` → count === 0
   - `eq` → `String(count) === value` (`value` required)
6. TOC (`buildTableOfContents`) skips blocks that fail `when` (and does not descend into hidden sections).
7. Nested children inherit parent hide (parent not rendered → children not rendered). Child `when` still applies when parent is shown.
8. Non-goal: AND/OR trees, entitlement-based conditions, arbitrary field paths, formulas.

## Consequences

- Export and preview must resolve collection counts once per render (reuse `CollectionService`).
- Module gates for counting `projects` / `timelineEvents` follow the same entitlement rules as collections GET; if the module is locked, treat count as `0` (fail closed for display) rather than failing the whole export — unless the document also contains a gated repeater/source that already asserts the module.
