-- Document content locale (ADR 015) + entity translations JSONB.

ALTER TABLE "documents" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'fa';

ALTER TABLE "project_categories" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "projects" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "team_members" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "branches" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "business_services" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "clients" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "certificates" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "timeline_events" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';
