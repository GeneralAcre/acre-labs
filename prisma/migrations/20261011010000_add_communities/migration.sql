-- DropIndex
DROP INDEX "CheckIn_xHandle_key";

-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "communityId" TEXT NOT NULL DEFAULT 'team1-thailand';

-- CreateTable
CREATE TABLE "Community" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "ownerAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Community_slug_key" ON "Community"("slug");

-- CreateIndex
CREATE INDEX "Community_ownerAddress_idx" ON "Community"("ownerAddress");

-- CreateIndex
CREATE INDEX "CheckIn_communityId_idx" ON "CheckIn"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_communityId_xHandle_key" ON "CheckIn"("communityId", "xHandle");

-- Seed the original single wall as the first community, so every existing
-- check-in (and the column default) has a valid parent before the FK lands.
INSERT INTO "Community" ("id", "slug", "name", "description", "imageUrl", "ownerAddress")
VALUES (
  'team1-thailand',
  'team1-thailand',
  'Team1 Thailand',
  'The Team1 Thailand community wall. Add your name and X handle to make your member card.',
  '/trustby/Team1.png',
  NULL
);

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

