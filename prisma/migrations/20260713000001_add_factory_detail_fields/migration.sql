ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "contactPerson" TEXT,
  ADD COLUMN IF NOT EXISTS "contactPhone"  TEXT,
  ADD COLUMN IF NOT EXISTS "machineCount"  INTEGER,
  ADD COLUMN IF NOT EXISTS "workerCount"   INTEGER,
  ADD COLUMN IF NOT EXISTS "buyerBrands"   TEXT,
  ADD COLUMN IF NOT EXISTS "notes"         TEXT;

-- Rename FM Team → Lucy in the internal accounts table
UPDATE "InternalAccount" SET "name" = 'Lucy' WHERE "accountId" = 'FM' AND "name" = 'FM Team';
