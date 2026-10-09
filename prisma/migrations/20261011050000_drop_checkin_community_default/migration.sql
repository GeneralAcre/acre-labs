-- AlterTable
ALTER TABLE "CheckIn" ALTER COLUMN "communityId" DROP DEFAULT;


-- The seeded Team1 Thailand community is being recreated by its organizer
-- through the app; it had no member cards.
DELETE FROM "Community" WHERE "id" = 'team1-thailand';
