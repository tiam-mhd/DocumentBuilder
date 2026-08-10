-- CreateEnum
CREATE TYPE "ShareLinkScope" AS ENUM ('web', 'pdf');

-- CreateTable
CREATE TABLE "document_share_links" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_hint" TEXT NOT NULL,
    "password_hash" TEXT,
    "scope" "ShareLinkScope" NOT NULL,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_share_links_token_hash_key" ON "document_share_links"("token_hash");

-- CreateIndex
CREATE INDEX "document_share_links_business_id_document_id_created_at_idx" ON "document_share_links"("business_id", "document_id", "created_at");

-- CreateIndex
CREATE INDEX "document_share_links_business_id_revoked_at_idx" ON "document_share_links"("business_id", "revoked_at");

-- AddForeignKey
ALTER TABLE "document_share_links" ADD CONSTRAINT "document_share_links_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_share_links" ADD CONSTRAINT "document_share_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
