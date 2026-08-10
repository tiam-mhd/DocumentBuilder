-- AlterTable
ALTER TABLE "documents" ADD COLUMN "analytics_view_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "analytics_download_count" INTEGER NOT NULL DEFAULT 0;

-- CreateEnum
CREATE TYPE "AnalyticsEventKind" AS ENUM ('view', 'download');

-- CreateEnum
CREATE TYPE "AnalyticsEventSource" AS ENUM ('web_publish', 'share_web', 'share_pdf', 'export_download');

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "kind" "AnalyticsEventKind" NOT NULL,
    "source" "AnalyticsEventSource" NOT NULL,
    "country" TEXT,
    "device" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_events_business_id_created_at_idx" ON "analytics_events"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_business_id_document_id_kind_created_at_idx" ON "analytics_events"("business_id", "document_id", "kind", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_business_id_kind_created_at_idx" ON "analytics_events"("business_id", "kind", "created_at");

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
