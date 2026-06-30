-- AlterTable
ALTER TABLE "MachineInstance" ADD COLUMN     "warrantyExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "AuditItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_DONE',
    "notes" TEXT,
    "documentUrl" TEXT,
    "autoFilled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePartStock" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sparePartId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minThreshold" INTEGER NOT NULL DEFAULT 2,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SparePartStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serialNumber" TEXT,
    "machineName" TEXT,
    "defectType" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "shift" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loggedByUserId" TEXT,

    CONSTRAINT "DefectLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AuditItem" ADD CONSTRAINT "AuditItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePartStock" ADD CONSTRAINT "SparePartStock_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePartStock" ADD CONSTRAINT "SparePartStock_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectLog" ADD CONSTRAINT "DefectLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
