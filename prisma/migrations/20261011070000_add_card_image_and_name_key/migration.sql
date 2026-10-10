-- AlterTable
ALTER TABLE "Community" ADD COLUMN     "cardImage" TEXT,
ADD COLUMN     "nameKey" TEXT;

-- Backfill: lowercased name with spaces/punctuation removed, matching
-- communityNameKey() in lib/communities.ts.
UPDATE "Community" SET "nameKey" = regexp_replace(lower("name"), '[^[:alnum:]]', '', 'g');

-- CreateIndex
CREATE UNIQUE INDEX "Community_nameKey_key" ON "Community"("nameKey");
