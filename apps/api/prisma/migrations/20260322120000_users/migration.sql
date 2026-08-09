-- DropTable
DROP TABLE IF EXISTS "health_probes";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "trial_consumed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_key" ON "users"("mobile");
