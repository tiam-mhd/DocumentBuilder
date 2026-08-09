-- AlterTable
ALTER TABLE "team_members" ADD COLUMN "parent_member_id" TEXT;

-- CreateIndex
CREATE INDEX "team_members_business_id_parent_member_id_deleted_at_idx" ON "team_members"("business_id", "parent_member_id", "deleted_at");

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_parent_member_id_fkey" FOREIGN KEY ("parent_member_id") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
