-- CreateEnum
CREATE TYPE "DocumentVersionSource" AS ENUM ('publish', 'manual');

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "source" "DocumentVersionSource" NOT NULL,
    "note" TEXT,
    "title" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fa',
    "status" "DocumentStatus" NOT NULL,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_versions_business_id_document_id_created_at_idx" ON "document_versions"("business_id", "document_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_document_id_version_number_key" ON "document_versions"("document_id", "version_number");

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
