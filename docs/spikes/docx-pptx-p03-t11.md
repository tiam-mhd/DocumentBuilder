# Spike P03-T11 — DOCX / PPTX from Document JSON

**Date:** 2026-08-09  
**Decision:** **Won't** (current version) — see [ADR 025](../adr/025-docx-pptx-export-wont.md).

## Goal

Two-day technical spike: is Office export (DOCX and/or PPTX) viable as a peer to PDF for VDB’s flow documents with Persian RTL?

## What “good enough” would mean

| Criterion | PDF today | DOCX/PPTX spike bar |
| --- | --- | --- |
| RTL fa + brand fonts | HTML/`@font-face` → Chromium embed | Word/PowerPoint must open without garbled runs; fonts registered per Business |
| Masters / headers / footers | Shared HTML contract | Native section headers or accepted degradation |
| TOC, repeater, when, bindings | Shared schema + HTML | Equivalent or clear unsupported matrix |
| Map / org / timeline / gallery | HTML + static assets | Image placeholders at best |
| Queue / entitlements | `export.pdf` | Would need new codes + jobs |

## Library scan (Node-first)

1. **`docx`** — Mature declarative OOXML writer. RTL is **manual**: paragraph `bidi`, run `rtl`, section settings, and Word’s `themeFontLang` / complex-script defaults are easy to miss; community workarounds exist for Arabic/Persian. No automatic mapping from our block tree.
2. **HTML→DOCX packages** — Tempting because we already have `DocumentHtmlRenderer`, but Word does not honor CSS print semantics the way Chromium PDF does (breaks, masters, sticky headers).
3. **`pptxgenjs`** — Slide-oriented. Our schema is continuous flow + logical pages, not a deck. Would invent a second layout model.
4. **External converters (Pandoc, soffice)** — Operational cost on dual-edition Docker/VPS; still weak for module blocks and font policy.

## Quality judgment (RTL Persian)

- PDF path already invests in `dir`/`lang`, embedded faces, and Chromium layout — that is the product’s print contract.
- A minimal DOCX “hello فارسی” PoC can look fine in isolation and still fail once masters, mixed LTR IDs, TOC page numbers, and module blocks appear.
- Closing that gap is a **multi-sprint renderer**, not a spike leftover.

## PoC choice

No production dependency or ExportModule adapter was added. A disposable hello-world DOCX would not change the coverage matrix above; the spike output is this report + ADR **Won't**.

## Recommendation

| Option | Verdict |
| --- | --- |
| Ship DOCX in Phase 03 | **No** |
| Ship PPTX in Phase 03 | **No** (wrong layout paradigm) |
| Skeleton adapter only | **No** — implies API surface without DoD |
| Formal Non-goal + revisit later | **Yes** |

Revisit when: paying demand for editable Office files + budget for OOXML RTL CI and block parity (or an explicit “text-only export” SKU with documented gaps).
