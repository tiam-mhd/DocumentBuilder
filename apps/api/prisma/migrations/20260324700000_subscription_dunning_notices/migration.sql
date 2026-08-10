-- CreateIndex
CREATE INDEX "subscriptions_status_ends_at_idx" ON "subscriptions"("status", "ends_at");

-- CreateTable
CREATE TABLE "subscription_dunning_notices" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "subscription_dunning_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_dunning_notices_subscription_id_kind_period_key_key" ON "subscription_dunning_notices"("subscription_id", "kind", "period_key");

-- CreateIndex
CREATE INDEX "subscription_dunning_notices_business_id_sent_at_idx" ON "subscription_dunning_notices"("business_id", "sent_at");

-- AddForeignKey
ALTER TABLE "subscription_dunning_notices" ADD CONSTRAINT "subscription_dunning_notices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
