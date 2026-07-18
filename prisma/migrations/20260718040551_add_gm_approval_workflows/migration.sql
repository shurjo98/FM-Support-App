-- CreateTable
CREATE TABLE "DemoApprovalRequest" (
    "id" TEXT NOT NULL,
    "requestedByAccountId" TEXT NOT NULL,
    "requestedByName" TEXT NOT NULL,
    "prospectCompany" TEXT NOT NULL,
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "machineOrProduct" TEXT NOT NULL,
    "proposedDate" TEXT,
    "location" TEXT,
    "purpose" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "decidedByAccountId" TEXT,
    "decidedByName" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "requestedByAccountId" TEXT NOT NULL,
    "requestedByName" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "decidedByAccountId" TEXT,
    "decidedByName" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountApprovalRequest" (
    "id" TEXT NOT NULL,
    "requestedByAccountId" TEXT NOT NULL,
    "requestedByName" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemOrQuoteDescription" TEXT NOT NULL,
    "originalAmount" DOUBLE PRECISION NOT NULL,
    "discountPercent" DOUBLE PRECISION,
    "discountAmount" DOUBLE PRECISION,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "decidedByAccountId" TEXT,
    "decidedByName" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalityApprovalRequest" (
    "id" TEXT NOT NULL,
    "requestedByAccountId" TEXT NOT NULL,
    "requestedByName" TEXT NOT NULL,
    "organizationId" TEXT,
    "venue" TEXT,
    "eventDate" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "attendees" TEXT,
    "purpose" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "decidedByAccountId" TEXT,
    "decidedByName" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HospitalityApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarrantyClaim" (
    "id" TEXT NOT NULL,
    "requestedByAccountId" TEXT NOT NULL,
    "requestedByName" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "machineId" TEXT,
    "serialNumber" TEXT,
    "customMachineName" TEXT,
    "issueDescription" TEXT NOT NULL,
    "claimType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "decidedByAccountId" TEXT,
    "decidedByName" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarrantyClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarrantyClaimAttachment" (
    "id" TEXT NOT NULL,
    "warrantyClaimId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarrantyClaimAttachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DiscountApprovalRequest" ADD CONSTRAINT "DiscountApprovalRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalityApprovalRequest" ADD CONSTRAINT "HospitalityApprovalRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyClaim" ADD CONSTRAINT "WarrantyClaim_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyClaim" ADD CONSTRAINT "WarrantyClaim_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyClaimAttachment" ADD CONSTRAINT "WarrantyClaimAttachment_warrantyClaimId_fkey" FOREIGN KEY ("warrantyClaimId") REFERENCES "WarrantyClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
