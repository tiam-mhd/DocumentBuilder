-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT '',
    "province" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "locations_business_id_deleted_at_name_idx" ON "locations"("business_id", "deleted_at", "name");

-- CreateIndex
CREATE INDEX "locations_business_id_lat_lng_idx" ON "locations"("business_id", "lat", "lng");

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Clear orphan stub location_id strings before FK (pre-T05 free-text stubs)
UPDATE "projects" SET "location_id" = NULL WHERE "location_id" IS NOT NULL AND "location_id" NOT IN (SELECT "id" FROM "locations");
UPDATE "branches" SET "location_id" = NULL WHERE "location_id" IS NOT NULL AND "location_id" NOT IN (SELECT "id" FROM "locations");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
