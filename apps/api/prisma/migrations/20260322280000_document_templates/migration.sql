-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "theme_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_templates_business_id_deleted_at_created_at_idx" ON "document_templates"("business_id", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "document_templates_business_id_name_idx" ON "document_templates"("business_id", "name");

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "design_themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
