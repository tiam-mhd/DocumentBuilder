-- MembershipRole: MEMBER → EDITOR; add VIEWER
CREATE TYPE "MembershipRole_new" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

ALTER TABLE "business_memberships" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "business_memberships"
  ALTER COLUMN "role" TYPE "MembershipRole_new"
  USING (
    CASE "role"::text
      WHEN 'MEMBER' THEN 'EDITOR'::"MembershipRole_new"
      ELSE "role"::text::"MembershipRole_new"
    END
  );

DROP TYPE "MembershipRole";
ALTER TYPE "MembershipRole_new" RENAME TO "MembershipRole";

ALTER TABLE "business_memberships"
  ALTER COLUMN "role" SET DEFAULT 'EDITOR'::"MembershipRole";

-- Invitations
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'revoked', 'expired');

CREATE TABLE "business_invitations" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "invited_by_user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_invitations_token_key" ON "business_invitations"("token");
CREATE INDEX "business_invitations_business_id_status_idx" ON "business_invitations"("business_id", "status");
CREATE INDEX "business_invitations_mobile_status_idx" ON "business_invitations"("mobile", "status");
CREATE INDEX "business_invitations_business_id_mobile_idx" ON "business_invitations"("business_id", "mobile");

ALTER TABLE "business_invitations"
  ADD CONSTRAINT "business_invitations_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business_invitations"
  ADD CONSTRAINT "business_invitations_invited_by_user_id_fkey"
  FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
