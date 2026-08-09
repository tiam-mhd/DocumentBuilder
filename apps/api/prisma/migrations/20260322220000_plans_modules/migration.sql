-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "plan_id" TEXT;

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "description_key" TEXT NOT NULL,
    "price_monthly" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "base_entitlements" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_modules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "description_key" TEXT NOT NULL,
    "price_monthly" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_modules" (
    "plan_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,

    CONSTRAINT "plan_modules_pkey" PRIMARY KEY ("plan_id","module_id")
);

-- CreateTable
CREATE TABLE "subscription_modules" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_modules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_modules_code_key" ON "catalog_modules"("code");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_modules_subscription_id_module_id_key" ON "subscription_modules"("subscription_id", "module_id");

-- AddForeignKey
ALTER TABLE "plan_modules" ADD CONSTRAINT "plan_modules_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_modules" ADD CONSTRAINT "plan_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "catalog_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_modules" ADD CONSTRAINT "subscription_modules_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_modules" ADD CONSTRAINT "subscription_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "catalog_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
