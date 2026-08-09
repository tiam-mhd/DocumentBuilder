# ADR 024 — Business backup / restore

## Status

Accepted (Phase 03 — P03-T10)

## Context

Owners need a portable package of one Business’s documents, design assets, and content — without dumping billing ledgers or cross-tenant data. Restore must not silently overwrite a populated workspace.

## Decision

1. **Format:** ZIP `vdb.business-backup` `formatVersion: 1` — `manifest.json` + `pg.json` + `mongo.json` + `files/` (media/fonts). See `.cursor/rules/16-backup-restore.mdc`.
2. **Jobs:** PG `workspace_backup_jobs` / `workspace_restore_jobs` + ObjectStorage + BullMQ queues `backup.workspace` / `restore.workspace`.
3. **Auth:** OWNER + writable subscription (EntitlementGuard).
4. **Restore:** upload → preview → commit; `confirmReplace` required when target is non-empty; IDs remapped into target `businessId`.
5. **Non-goals:** cross-install SaaS marketplace transfer, incremental backup, membership/billing restore, user account merge.

## Consequences

- Mongo bodies and storage binaries travel with the package for round-trip fidelity.
- Deploy docs note tenant ZIP vs platform DB backup.
