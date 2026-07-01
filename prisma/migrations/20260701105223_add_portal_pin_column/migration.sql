-- Production fix: the previous migration (add_portal_pin) was empty because
-- the local dev DB already had this column. This migration adds it properly.
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "portalPin" TEXT;
