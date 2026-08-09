# ADR 011 — QR block: server encode into PDF HTML

## Status

Accepted (Phase 02 — P02-T09)

## Context

Documents need a QR block for url / phone / email / map / custom payloads. Preview and PDF must show a scannable code. Dynamic short-link redirects are out of MVP.

## Decision

1. **Block type `qr`** is a **core** block (`moduleCode: null`) — no sellable module.
2. **Payload encoding** is shared in `@vdb/document-schema` (`buildQrPayload`).
3. **QR image generation is server-side** (`qrcode` → PNG data URL) for PDF HTML embeds and for `POST .../qr/encode` (editor preview).
4. Export HTML embeds `<img src="data:image/png;base64,...">` so Chromium PDF needs no network.
5. **Non-goal:** tracked/dynamic redirect QR destinations (short links that resolve later) — defer to a later phase.

## Consequences

- Editor preview calls the encode API (JWT + membership); PDF uses the same util on the worker.
- Invalid/empty value → dashed placeholder in preview/PDF (no crash).
