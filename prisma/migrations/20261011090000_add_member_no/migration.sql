-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN     "memberNo" INTEGER;

-- Backfill: existing cards keep the number they showed before, counted up
-- from the earliest join in each community.
UPDATE "CheckIn" AS c SET "memberNo" = n.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "communityId" ORDER BY "createdAt", "id") AS rn
  FROM "CheckIn"
) AS n
WHERE c."id" = n."id";

ALTER TABLE "CheckIn" ALTER COLUMN "memberNo" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_communityId_memberNo_key" ON "CheckIn"("communityId", "memberNo");
