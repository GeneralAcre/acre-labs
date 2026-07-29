-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('pending', 'confirmed');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contractAddress" TEXT NOT NULL,
    "secretCode" TEXT NOT NULL,
    "eventEndTime" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imageUrl" TEXT,
    "maxSupply" INTEGER,
    "claimedCount" INTEGER NOT NULL DEFAULT 0,
    "ownerAddress" TEXT NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL,
    "txHash" TEXT,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_ownerAddress_idx" ON "Event"("ownerAddress");

-- CreateIndex
CREATE INDEX "Claim_eventId_idx" ON "Claim"("eventId");

-- CreateIndex
CREATE INDEX "Claim_walletAddress_idx" ON "Claim"("walletAddress");

-- CreateIndex
CREATE INDEX "Claim_txHash_idx" ON "Claim"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_eventId_walletAddress_key" ON "Claim"("eventId", "walletAddress");

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
