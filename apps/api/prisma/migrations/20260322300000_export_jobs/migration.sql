-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('queued', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'queued',
    "error_code" TEXT,
    "error_message" TEXT,
    "storage_key" TEXT,
    "byte_size" INTEGER,
    "mime_type" TEXT NOT NULL DEFAULT 'application/pdf',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "export_jobs_business_id_document_id_created_at_idx" ON "export_jobs"("business_id", "document_id", "created_at");

-- CreateIndex
CREATE INDEX "export_jobs_business_id_status_created_at_idx" ON "export_jobs"("business_id", "status", "created_at");

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
