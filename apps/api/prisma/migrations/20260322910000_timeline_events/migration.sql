-- CreateTable
CREATE TABLE "timeline_events" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "media_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "fields" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timeline_events_business_id_deleted_at_occurred_at_idx" ON "timeline_events"("business_id", "deleted_at", "occurred_at");

-- CreateIndex
CREATE INDEX "timeline_events_business_id_deleted_at_sort_order_idx" ON "timeline_events"("business_id", "deleted_at", "sort_order");

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
