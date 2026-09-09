-- CreateEnum
CREATE TYPE "Product" AS ENUM ('badge', 'content');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "product" "Product" NOT NULL DEFAULT 'badge';
