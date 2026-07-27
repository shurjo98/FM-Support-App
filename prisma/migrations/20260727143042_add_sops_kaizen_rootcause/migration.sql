-- AlterTable
ALTER TABLE "DefectLog" ADD COLUMN     "rootCause" TEXT[];

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "rootCause" TEXT[];

-- CreateTable
CREATE TABLE "Sop" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "steps" TEXT[],
    "photoIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "Sop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KaizenSuggestion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "submittedBy" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KaizenSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sop_machineId_key" ON "Sop"("machineId");

-- AddForeignKey
ALTER TABLE "Sop" ADD CONSTRAINT "Sop_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KaizenSuggestion" ADD CONSTRAINT "KaizenSuggestion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
