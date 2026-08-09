-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "template_id" TEXT,
    "title" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_business_id_deleted_at_created_at_idx" ON "documents"("business_id", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "documents_business_id_status_deleted_at_idx" ON "documents"("business_id", "status", "deleted_at");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
