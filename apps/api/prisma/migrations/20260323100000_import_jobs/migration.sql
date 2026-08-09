-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('uploaded', 'mapped', 'queued', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "ImportEntityType" AS ENUM ('projects');

-- CreateEnum
CREATE TYPE "ImportFileFormat" AS ENUM ('csv', 'xlsx');

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "entity_type" "ImportEntityType" NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'uploaded',
    "format" "ImportFileFormat" NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mapping" JSONB,
    "preview" JSONB,
    "result" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_jobs_business_id_created_at_idx" ON "import_jobs"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "import_jobs_business_id_status_created_at_idx" ON "import_jobs"("business_id", "status", "created_at");

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
