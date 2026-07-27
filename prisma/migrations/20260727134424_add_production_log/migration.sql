-- CreateTable
CREATE TABLE "ProductionLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serialNumber" TEXT,
    "machineName" TEXT,
    "quantity" INTEGER NOT NULL,
    "shift" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loggedByUserId" TEXT,

    CONSTRAINT "ProductionLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProductionLog" ADD CONSTRAINT "ProductionLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
