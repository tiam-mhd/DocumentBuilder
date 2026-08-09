# ADR 017 — Smart pagination & break rules

## Status

Accepted (Phase 03 — P03-T03)

## Context

Corporate PDFs need content to flow across sheets without orphan titles and without splitting keep-together blocks. Absolute free-canvas layout is forbidden. Chromium print can still reflow, so we need an explicit **logical** pagination pass plus CSS hints.

## Decision

### 1. `breakRules` on `BlockNode` (additive, schema v3)

Optional object:

| Field | Meaning |
| --- | --- |
| `keepTogether` | Treat block (or expanded repeater card) as atomic — never split across pages in the flow algorithm |
| `keepWithNext` | Prefer staying on the same page as the next sibling (orphan-title guard) |
| `breakBefore` | Start a new page before this block |
| `breakAfter` | Start a new page after this block |

Defaults by type (overridable in UI): headings/`section` → `keepWithNext`; media/module chrome blocks → `keepTogether`.

### 2. Shared algorithm `paginateDocumentBody` (`@vdb/document-schema`)

1. Flatten each logical page’s top-level visible blocks into **flow units**.
2. Expand `repeater` into one unit per card (bound children) with `keepTogether: true`.
3. Pack units into pages using **estimated heights** vs content capacity derived from `page.size` / margins (abstract units — not DOM measure).
4. Emit new `pages[]` (same `masterId`), preserving block ids where possible.

### 3. Preview (approximate) vs Final PDF

| Surface | Behavior |
| --- | --- |
| **Editor preview** | Runs the **same** `paginateDocumentBody` with height **estimates**. Shows stacked page frames. **Not** pixel-accurate vs Chromium. |
| **Final PDF** | Same packer → HTML `.page` sections + CSS `break-inside: avoid` / `break-before: page` as defense-in-depth. Chromium may still micro-adjust; TOC stays on **logical** `pages[]` (ADR 012). |

### 4. Non-goals

- Absolute x/y canvas pagination
- Full font/DOM measurement two-pass engine (future)
- Splitting a single text paragraph mid-sentence across pages in the packer (units are atomic)

## Consequences

- Long repeaters (e.g. 30 projects) produce multiple logical pages in export and approximate preview.
- Authors set break rules in the block inspector.
- `page.autoPaginate` (default `true`) can disable the packer for edge cases.
