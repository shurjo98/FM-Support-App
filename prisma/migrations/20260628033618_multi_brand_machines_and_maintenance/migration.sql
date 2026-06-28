-- DropForeignKey
ALTER TABLE "MachineInstance" DROP CONSTRAINT "MachineInstance_machineId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_machineId_fkey";

-- AlterTable
ALTER TABLE "Machine" ADD COLUMN     "brand" TEXT NOT NULL DEFAULT 'Jack';

-- AlterTable
ALTER TABLE "MachineInstance" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "customName" TEXT,
ADD COLUMN     "lastServicedAt" TIMESTAMP(3),
ADD COLUMN     "serviceIntervalMonths" INTEGER,
ALTER COLUMN "machineId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "customBrand" TEXT,
ADD COLUMN     "customMachineName" TEXT,
ALTER COLUMN "machineId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "MachineInstance" ADD CONSTRAINT "MachineInstance_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
