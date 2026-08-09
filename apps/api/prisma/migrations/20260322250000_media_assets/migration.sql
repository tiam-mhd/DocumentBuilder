-- CreateEnum
CREATE TYPE "MediaAssetStatus" AS ENUM ('ready', 'processing', 'failed');

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "storage_key" TEXT NOT NULL,
    "thumb_key" TEXT,
    "web_key" TEXT,
    "print_key" TEXT,
    "status" "MediaAssetStatus" NOT NULL DEFAULT 'ready',
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_assets_business_id_deleted_at_created_at_idx" ON "media_assets"("business_id", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "media_assets_business_id_original_name_idx" ON "media_assets"("business_id", "original_name");

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
