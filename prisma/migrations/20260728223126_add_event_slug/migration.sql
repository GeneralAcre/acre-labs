-- AlterTable
ALTER TABLE "Event" ADD COLUMN "slug" TEXT;

-- Backfill (table is empty pre-launch, but keep this safe for any future re-run)
UPDATE "Event" SET "slug" = 'event-' || substr(md5(random()::text), 1, 8) WHERE "slug" IS NULL;

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
