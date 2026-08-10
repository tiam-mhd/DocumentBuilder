-- AlterTable
ALTER TABLE "documents" ADD COLUMN "web_slug" TEXT,
ADD COLUMN "web_published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "web_published_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "documents_business_id_web_published_web_slug_idx" ON "documents"("business_id", "web_published", "web_slug");

-- CreateIndex
CREATE UNIQUE INDEX "documents_business_id_web_slug_key" ON "documents"("business_id", "web_slug");
