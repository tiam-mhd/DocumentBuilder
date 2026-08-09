-- CreateTable
CREATE TABLE "galleries" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "galleries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_items" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "gallery_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "galleries_business_id_deleted_at_sort_order_idx" ON "galleries"("business_id", "deleted_at", "sort_order");

-- CreateIndex
CREATE INDEX "gallery_items_business_id_gallery_id_deleted_at_sort_order_idx" ON "gallery_items"("business_id", "gallery_id", "deleted_at", "sort_order");

-- CreateIndex
CREATE INDEX "gallery_items_business_id_media_id_idx" ON "gallery_items"("business_id", "media_id");

-- AddForeignKey
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
