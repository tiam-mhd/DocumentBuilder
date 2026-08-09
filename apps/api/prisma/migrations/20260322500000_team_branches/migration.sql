-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "name" TEXT NOT NULL,
    "role_title" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '',
    "photo_media_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "fields" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address_line1" TEXT NOT NULL DEFAULT '',
    "address_line2" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "province" TEXT NOT NULL DEFAULT '',
    "postal_code" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "location_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "fields" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_members_business_id_deleted_at_sort_order_idx" ON "team_members"("business_id", "deleted_at", "sort_order");

-- CreateIndex
CREATE INDEX "team_members_business_id_branch_id_deleted_at_idx" ON "team_members"("business_id", "branch_id", "deleted_at");

-- CreateIndex
CREATE INDEX "branches_business_id_deleted_at_sort_order_idx" ON "branches"("business_id", "deleted_at", "sort_order");

-- CreateIndex
CREATE INDEX "branches_business_id_location_id_idx" ON "branches"("business_id", "location_id");

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
