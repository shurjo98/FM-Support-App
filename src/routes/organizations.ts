import { Router } from "express";
import { prisma } from "../db";
import { requireInternalAuth } from "../middleware/requireInternalAuth";

const router = Router();
router.use(requireInternalAuth);

export const REGIONS = ["Dhaka", "Cumilla", "Chittagong", "Ashulia", "Gazipur", "Narayongonj"] as const;

function hasRole(roles: string[], role: string): boolean {
  return roles.some((r) => r.toUpperCase() === role.toUpperCase());
}

async function canManageTasks(accountId?: string): Promise<boolean> {
  if (!accountId) return false;
  const account = await prisma.internalAccount.findUnique({ where: { id: accountId } });
  if (!account) return false;
  return hasRole(account.roles, "MANAGER") || hasRole(account.roles, "ADMIN");
}

// GET /organizations -> factory list for the New Task picker and Factories admin page.
// Open to any authenticated internal user; never returns portalPassword.
router.get("/", async (_req, res) => {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, location: true, region: true, portalUserId: true, portalPassword: true },
    orderBy: { name: "asc" },
  });
  res.json(
    orgs.map((o) => ({
      id: o.id,
      name: o.name,
      location: o.location,
      region: o.region,
      portalUserId: o.portalUserId,
      hasCredentials: !!o.portalPassword,
    }))
  );
});

// POST /organizations -> create a factory (Manager/Admin only).
router.post("/", async (req, res) => {
  const { name, location, region, actingAccountId } = req.body as {
    name?: string;
    location?: string;
    region?: string;
    actingAccountId?: string;
  };

  if (!(await canManageTasks(actingAccountId))) {
    return res.status(403).json({ error: "Only a Manager or Admin can add factories." });
  }
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
    },
  });

  res.status(201).json({
    id: created.id,
    name: created.name,
    location: created.location,
    region: created.region,
    portalUserId: created.portalUserId,
    hasCredentials: !!created.portalPassword,
  });
});

// PATCH /organizations/:id -> edit name/location/region and/or set portal login credentials
// (Manager/Admin only).
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, location, region, portalUserId, portalPassword, actingAccountId } = req.body as {
    name?: string;
    location?: string;
    region?: string;
    portalUserId?: string;
    portalPassword?: string;
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
    },
  });

  res.json({
    id: updated.id,
    name: updated.name,
    location: updated.location,
    region: updated.region,
    portalUserId: updated.portalUserId,
    hasCredentials: !!updated.portalPassword,
  });
});

export default router;
