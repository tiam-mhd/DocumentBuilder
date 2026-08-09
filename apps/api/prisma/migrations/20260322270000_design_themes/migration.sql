-- CreateTable
CREATE TABLE "design_themes" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "tokens" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "design_themes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "design_themes_business_id_deleted_at_is_default_idx" ON "design_themes"("business_id", "deleted_at", "is_default");

-- CreateIndex
CREATE INDEX "design_themes_business_id_deleted_at_created_at_idx" ON "design_themes"("business_id", "deleted_at", "created_at");

-- AddForeignKey
ALTER TABLE "design_themes" ADD CONSTRAINT "design_themes_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
