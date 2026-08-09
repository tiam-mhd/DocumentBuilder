-- CreateEnum
CREATE TYPE "FontStyle" AS ENUM ('normal', 'italic');

-- CreateTable
CREATE TABLE "font_faces" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 400,
    "style" "FontStyle" NOT NULL DEFAULT 'normal',
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "font_faces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "font_faces_business_id_deleted_at_family_idx" ON "font_faces"("business_id", "deleted_at", "family");

-- CreateIndex
CREATE INDEX "font_faces_business_id_family_weight_style_idx" ON "font_faces"("business_id", "family", "weight", "style");

-- AddForeignKey
ALTER TABLE "font_faces" ADD CONSTRAINT "font_faces_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
