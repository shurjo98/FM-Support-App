import { Router } from "express";
import { prisma } from "../db";
import { requireInternalAuth } from "../middleware/requireInternalAuth";

const router = Router();
router.use(requireInternalAuth);

export const REGIONS = ["Dhaka", "Cumilla", "Chittagong", "Ashulia", "Gazipur", "Narayanganj"] as const;

function hasRole(roles: string[], role: string): boolean {
  return roles.some((r) => r.toUpperCase() === role.toUpperCase());
}

async function canManageTasks(accountId?: string): Promise<boolean> {
  if (!accountId) return false;
  const account = await prisma.internalAccount.findUnique({ where: { id: accountId } });
  if (!account) return false;
  return hasRole(account.roles, "MANAGER") || hasRole(account.roles, "ADMIN");
}

const ORG_SELECT = {
  id: true, name: true, location: true, region: true,
  portalUserId: true, portalPassword: true,
  contactPerson: true, contactPhone: true,
  machineCount: true, workerCount: true,
  buyerBrands: true, notes: true,
} as const;

function toPublic(o: {
  id: string; name: string; location: string | null; region: string | null;
  portalUserId: string | null; portalPassword: string | null;
  contactPerson: string | null; contactPhone: string | null;
  machineCount: number | null; workerCount: number | null;
  buyerBrands: string | null; notes: string | null;
}) {
  return {
    id: o.id,
    name: o.name,
    location: o.location,
    region: o.region,
    portalUserId: o.portalUserId,
    hasCredentials: !!o.portalPassword,
    contactPerson: o.contactPerson,
    contactPhone: o.contactPhone,
    machineCount: o.machineCount,
    workerCount: o.workerCount,
    buyerBrands: o.buyerBrands,
    notes: o.notes,
  };
}

// GET /organizations -> factory list for the New Task picker and Factories admin page.
// Open to any authenticated internal user; never returns portalPassword.
router.get("/", async (_req, res) => {
  const orgs = await prisma.organization.findMany({ select: ORG_SELECT, orderBy: { name: "asc" } });
  res.json(orgs.map(toPublic));
});

// POST /organizations -> create a factory (any authenticated team member).
router.post("/", async (req, res) => {
  const { name, location, region, contactPerson, contactPhone, machineCount, workerCount, buyerBrands, notes } = req.body as {
    name?: string;
    location?: string;
    region?: string;
    contactPerson?: string;
    contactPhone?: string;
    machineCount?: number;
    workerCount?: number;
    buyerBrands?: string;
    notes?: string;
    actingAccountId?: string;
  };

  if (!name?.trim()) return res.status(400).json({ error: "name is required" });
  if (region && !REGIONS.includes(region as (typeof REGIONS)[number])) {
    return res.status(400).json({ error: `region must be one of: ${REGIONS.join(", ")}` });
  }

  const created = await prisma.organization.create({
    data: {
      id: `org-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      location: location?.trim() || null,
      region: region || null,
      contactPerson: contactPerson?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
      machineCount: machineCount ?? null,
      workerCount: workerCount ?? null,
      buyerBrands: buyerBrands?.trim() || null,
      notes: notes?.trim() || null,
    },
    select: ORG_SELECT,
  });

  res.status(201).json(toPublic(created));
});

// PATCH /organizations/:id -> edit factory fields and/or portal login credentials (Manager/Admin only).
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name, location, region, portalUserId, portalPassword,
    contactPerson, contactPhone, machineCount, workerCount, buyerBrands, notes,
    actingAccountId,
  } = req.body as {
    name?: string;
    location?: string;
    region?: string;
    portalUserId?: string;
    portalPassword?: string;
    contactPerson?: string;
    contactPhone?: string;
    machineCount?: number | null;
    workerCount?: number | null;
    buyerBrands?: string;
    notes?: string;
    actingAccountId?: string;
  };

  if (!(await canManageTasks(actingAccountId))) {
    return res.status(403).json({ error: "Only a Manager or Admin can edit factories." });
  }

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) return res.status(404).json({ error: "Factory not found" });

  if (region && !REGIONS.includes(region as (typeof REGIONS)[number])) {
    return res.status(400).json({ error: `region must be one of: ${REGIONS.join(", ")}` });
  }

  if (portalUserId?.trim()) {
    const existing = await prisma.organization.findUnique({ where: { portalUserId: portalUserId.trim() } });
    if (existing && existing.id !== id) {
      return res.status(409).json({ error: "That login ID is already taken by another factory." });
    }
  }

  const updated = await prisma.organization.update({
    where: { id },
    data: {
      ...(name?.trim() ? { name: name.trim() } : {}),
      ...(location !== undefined ? { location: location?.trim() || null } : {}),
      ...(region !== undefined ? { region: region || null } : {}),
      ...(portalUserId?.trim() ? { portalUserId: portalUserId.trim() } : {}),
      ...(portalPassword?.trim() ? { portalPassword: portalPassword.trim() } : {}),
      ...(contactPerson !== undefined ? { contactPerson: contactPerson?.trim() || null } : {}),
      ...(contactPhone !== undefined ? { contactPhone: contactPhone?.trim() || null } : {}),
      ...(machineCount !== undefined ? { machineCount: machineCount ?? null } : {}),
      ...(workerCount !== undefined ? { workerCount: workerCount ?? null } : {}),
      ...(buyerBrands !== undefined ? { buyerBrands: buyerBrands?.trim() || null } : {}),
      ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
    },
    select: ORG_SELECT,
  });

  res.json(toPublic(updated));
});

export default router;
