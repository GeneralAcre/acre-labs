-- AlterTable
ALTER TABLE "Community" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'community',
ADD COLUMN     "place" TEXT;
