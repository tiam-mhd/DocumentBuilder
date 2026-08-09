-- CreateTable
CREATE TABLE "installation_licenses" (
    "id" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_hint" TEXT NOT NULL,
    "organization_name" TEXT,
    "activated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installation_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "installation_licenses_key_hash_key" ON "installation_licenses"("key_hash");

-- CreateIndex
CREATE INDEX "installation_licenses_revoked_at_expires_at_idx" ON "installation_licenses"("revoked_at", "expires_at");
