-- AlterTable
ALTER TABLE "InternalTask" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "portalPassword" TEXT,
ADD COLUMN IF NOT EXISTS "portalUserId" TEXT,
ADD COLUMN IF NOT EXISTS "region" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_portalUserId_key" ON "Organization"("portalUserId");

-- AddForeignKey
ALTER TABLE "InternalTask" DROP CONSTRAINT IF EXISTS "InternalTask_organizationId_fkey";
ALTER TABLE "InternalTask" ADD CONSTRAINT "InternalTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
