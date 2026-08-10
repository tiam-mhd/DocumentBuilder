-- CreateTable
CREATE TABLE "business_branding" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "display_name" TEXT,
    "primary_color" TEXT,
    "logo_storage_key" TEXT,
    "logo_mime_type" TEXT,
    "logo_byte_size" INTEGER,
    "custom_domain" TEXT,
    "hide_powered_by" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_branding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_branding_business_id_key" ON "business_branding"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_branding_custom_domain_key" ON "business_branding"("custom_domain");

-- AddForeignKey
ALTER TABLE "business_branding" ADD CONSTRAINT "business_branding_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
