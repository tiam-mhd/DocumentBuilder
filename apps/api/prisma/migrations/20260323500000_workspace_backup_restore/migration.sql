-- Business workspace backup / restore jobs (ADR 024).

CREATE TYPE "WorkspaceBackupStatus" AS ENUM ('queued', 'processing', 'completed', 'failed');
CREATE TYPE "WorkspaceRestoreStatus" AS ENUM ('uploaded', 'queued', 'processing', 'completed', 'failed');

CREATE TABLE "workspace_backup_jobs" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "status" "WorkspaceBackupStatus" NOT NULL DEFAULT 'queued',
    "storage_key" TEXT,
    "byte_size" INTEGER,
    "mime_type" TEXT NOT NULL DEFAULT 'application/zip',
    "manifest" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "workspace_backup_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspace_restore_jobs" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "status" "WorkspaceRestoreStatus" NOT NULL DEFAULT 'uploaded',
    "storage_key" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL DEFAULT 'application/zip',
    "original_filename" TEXT NOT NULL,
    "preview" JSONB,
    "result" JSONB,
    "confirm_replace" BOOLEAN NOT NULL DEFAULT false,
    "error_code" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "workspace_restore_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workspace_backup_jobs_business_id_created_at_idx" ON "workspace_backup_jobs"("business_id", "created_at");
CREATE INDEX "workspace_backup_jobs_business_id_status_created_at_idx" ON "workspace_backup_jobs"("business_id", "status", "created_at");
CREATE INDEX "workspace_restore_jobs_business_id_created_at_idx" ON "workspace_restore_jobs"("business_id", "created_at");
CREATE INDEX "workspace_restore_jobs_business_id_status_created_at_idx" ON "workspace_restore_jobs"("business_id", "status", "created_at");

ALTER TABLE "workspace_backup_jobs" ADD CONSTRAINT "workspace_backup_jobs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_restore_jobs" ADD CONSTRAINT "workspace_restore_jobs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
