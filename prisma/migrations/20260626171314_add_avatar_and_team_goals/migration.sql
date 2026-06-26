-- AlterTable
ALTER TABLE "InternalAccount" ADD COLUMN     "avatarUrl" TEXT;

-- CreateTable
CREATE TABLE "TeamGoal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamGoal_pkey" PRIMARY KEY ("id")
);
