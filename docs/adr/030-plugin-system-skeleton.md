# ADR 030 — Plugin / Extension System Skeleton

## Status

Accepted (P04-T08)

## Context

Product needs a safe extension point for additional block types / module bindings without forking Core or allowing arbitrary tenant code execution. Full third-party plugin economy is not funded.

## Decision

1. Introduce `@vdb/plugins` with Zod-validated **manifests** (`id`, `version`, `blocks`, optional `moduleCode`, `trust: first-party`).
2. First-party plugins are **compiled into the monorepo** under `packages/plugins` and loaded at boot via `loadFirstPartyPlugins()`.
3. Plugin block types use the `plugin.*` namespace and register into `@vdb/document-schema` (`registerPluginBlocks` / `getBlockRegistry`).
4. HTML preview + PDF renderer treat unknown block types as **fail-safe** (placeholder / empty) — never throw.
5. **Non-goal:** user-uploaded code, remote unsigned plugins, `eval`.

## Consequences

- Core enum of built-in blocks remains; plugins are additive.
- Future signed third-party plugins need a new ADR + trust model.
- Both editions receive the same first-party plugin set.
