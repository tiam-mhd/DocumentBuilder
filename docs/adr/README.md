# ADR index

Architecture decisions will be recorded here as numbered Markdown files.

Locked at Foundation:

- Stack: NestJS + Next.js + PostgreSQL + Redis + MongoDB
- ORM: Prisma (PG) · official MongoDB driver
- i18n: next-intl only
- OpenAPI: `docs/api/openapi.yaml` canonical
- Map PDF: static image embed — `008-map-pdf-static.md`
- Org Chart PDF: HTML/CSS tree — `009-org-chart-html-pdf.md`
- Timeline PDF: HTML/CSS events — `010-timeline-html-pdf.md`
- QR block: server PNG data URL in HTML — `011-qr-block-server-encode.md`
- Auto TOC: logical `pages[]` index — `012-toc-logical-page-numbers.md`
- Repeater collections: `{{item.*}}` — `013-repeater-collections.md`
- Conditional visibility: `when` + exists/empty/eq — `014-conditional-visibility.md`
