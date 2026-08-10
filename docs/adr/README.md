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
- Document content locale FA/EN — `015-document-content-locale.md`
- Safe data binding / count formulas (no eval) — `016-safe-data-binding.md`
- Smart pagination / breakRules (estimate packer) — `017-smart-pagination-breaks.md`
- Interactive PDF links + Chromium outline — `018-interactive-pdf.md`
- Content import Excel/CSV (Projects) — `019-content-import-excel-csv.md`
- Document versioning (PG meta + Mongo snapshot) — `020-document-versioning.md`
- Document approval workflow (draft→review→approved→published) — `021-document-approval-workflow.md`
- Document comments (PG anchors + resolve) — `022-document-comments.md`
- Audit log UI + event catalog — `023-audit-log-ui.md`
- Business backup / restore ZIP — `024-business-backup-restore.md`
- DOCX/PPTX export **Won't** (current version) — `025-docx-pptx-export-wont.md`
- Web Publish (public HTML ≠ workflow published) — `026-web-publish.md`
- Document share links (token / password / expiry) — `027-share-links.md`
- Basic analytics (views / downloads) — `028-analytics-basic.md`
- Template marketplace skeleton (SAAS catalog; payments non-goal) — `029-template-marketplace-skeleton.md`
- Plugin / extension skeleton (first-party manifests; no user eval) — `030-plugin-system-skeleton.md`
- SAAS platform admin console — `031-saas-platform-admin.md`
- Billing renewal / grace / dunning — `032-billing-dunning-renewal.md`
- Pre-GA performance & security hardening — `033-performance-security-hardening.md`
- Auth password / 2FA + Parsgreen SMS — `034-auth-password-2fa-parsgreen.md`
