-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "xHandle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_xHandle_key" ON "CheckIn"("xHandle");

-- CreateIndex
CREATE INDEX "CheckIn_createdAt_idx" ON "CheckIn"("createdAt");
