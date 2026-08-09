# ADR 025 — DOCX/PPTX export (Phase 03 spike)

## Status

**Won't** for the current product version (P03-T11 spike). Revisit only with an explicit product unlock.

## Context

Phase 03 optional spike asked whether Document JSON → DOCX and/or PPTX is worth shipping beside the locked PDF pipeline (`Document JSON` → canonical HTML/CSS → Chromium via BullMQ).

VDB requirements that any Office export must match:

- Persian **RTL** + registered Business fonts
- Flow + masters + smart breaks + TOC / repeater / module blocks (map, org chart, timeline, gallery)
- Same entitlement gate pattern as `export.pdf`
- No editor keystroke rendering

## Options evaluated

| Approach | Fit | RTL / fa notes |
| --- | --- | --- |
| **`docx` (JS)** | Text paragraphs / tables | Bidirectional props exist, but Word still needs multiple OOXML layers (`themeFontLang`, section/paragraph `bidi`, run `rtl`, logical `start`/`end` alignment). Easy to ship broken FA without a dedicated RTL harness. |
| **HTML → DOCX converters** | Reuse HTML renderer | Layout fidelity collapses (masters, page breaks, complex blocks); fonts/CSS ≠ Word styles. |
| **`pptxgenjs` / PPTX** | Slide deck API | Product model is **flow document**, not slides; mapping pages→slides is a different product. RTL support is weaker than Word. |
| **Pandoc / LibreOffice headless** | Ops-heavy | Extra binary + host deps; still poor for branded module blocks; conflicts with Docker/VPS simplicity. |
| **Python `docxfa`-class tools** | Better FA RTL in isolation | Outside locked NestJS stack; still no parity with map/org/TOC/masters. |

## Decision

**Do not** ship DOCX or PPTX export in the current Core / Phase 03 product.

1. **Primary final export remains PDF** (ADR 007 + interactive PDF ADR 018).
2. Treat DOCX/PPTX as an explicit **Non-goal** until product law unlocks a separate entitlement (e.g. `export.docx`) and a funded renderer track.
3. Do **not** add a production adapter stub that implies API completeness (avoids half-gated routes).

## Consequences

- Rules and Phase 03 overview document the Non-goal.
- Spike report: `docs/spikes/docx-pptx-p03-t11.md`.
- Future Go would require: OOXML RTL acceptance tests (fa), font embedding strategy, block coverage matrix vs HTML renderer, and separate BullMQ job types — not a thin wrapper.
