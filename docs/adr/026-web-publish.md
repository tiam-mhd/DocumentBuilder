# ADR 026 — Web Publish (public HTML profile)

## Status

Accepted (P04-T04)

## Context

Customers need a public HTML profile of a Document. PDF already uses canonical HTML from `DocumentHtmlRenderer`. Approval workflow uses `status=published`, which must not be conflated with “on the public web.”

## Decision

1. Add `web_slug`, `web_published`, `web_published_at` on PostgreSQL `documents`.
2. Public HTML is built by the **same** export HTML pipeline as PDF (`ExportService.buildDocumentHtml`).
3. Mutating web publish requires permission `documents.publish` + writable subscription; enable only when status is `approved` or `published`.
4. Workflow transitions that leave those statuses clear `web_published`.
5. Next.js public route renders the HTML with SEO (`title`, `lang`/`dir`); white-label footer/logo from `business_branding`.

## Consequences

- Share-links (P04-T05) add tokens/expiry without replacing slug publish — see ADR 027 / `20-share-links.mdc`
- Custom domain publish resolves business via `GET /branding/resolve` then slug.
