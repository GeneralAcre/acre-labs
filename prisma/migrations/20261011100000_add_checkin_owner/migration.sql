-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN     "ownerAddress" TEXT;

-- Backfill: cards whose X handle is linked to a profile belong to that wallet.
UPDATE "CheckIn" AS c SET "ownerAddress" = p."address"
FROM "Profile" AS p
WHERE p."xHandle" = c."xHandle";

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_communityId_ownerAddress_key" ON "CheckIn"("communityId", "ownerAddress");
