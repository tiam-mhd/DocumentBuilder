-- CreateTable
CREATE TABLE "document_comments" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "page_id" TEXT,
    "block_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "document_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_comments_business_id_document_id_deleted_at_created_at_idx" ON "document_comments"("business_id", "document_id", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "document_comments_business_id_document_id_resolved_at_idx" ON "document_comments"("business_id", "document_id", "resolved_at");

-- AddForeignKey
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
