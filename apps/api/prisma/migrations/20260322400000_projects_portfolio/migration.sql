-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "project_categories" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "project_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "category_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "ProjectStatus" NOT NULL DEFAULT 'draft',
    "cover_media_id" TEXT,
    "media_ids" JSONB NOT NULL DEFAULT '[]',
    "location_id" TEXT,
    "fields" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_categories_business_id_deleted_at_sort_order_idx" ON "project_categories"("business_id", "deleted_at", "sort_order");

-- CreateIndex
CREATE INDEX "projects_business_id_deleted_at_created_at_idx" ON "projects"("business_id", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "projects_business_id_status_deleted_at_idx" ON "projects"("business_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "projects_business_id_category_id_deleted_at_idx" ON "projects"("business_id", "category_id", "deleted_at");

-- CreateIndex
CREATE INDEX "projects_business_id_location_id_idx" ON "projects"("business_id", "location_id");

-- AddForeignKey
ALTER TABLE "project_categories" ADD CONSTRAINT "project_categories_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "project_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
