-- Business function tag(s) per team member (Commercial, Branding, Stock
-- Maintenance, After-Sales Support, etc.) — separate from the permission
-- level `role`, and multi-valued since one person can cover more than one.
ALTER TABLE "InternalAccount" ADD COLUMN "departments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
