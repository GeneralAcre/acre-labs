-- CreateTable
CREATE TABLE "Profile" (
    "address" TEXT NOT NULL,
    "displayName" TEXT,
    "xHandle" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("address")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_xHandle_key" ON "Profile"("xHandle");

