import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db";

const router = Router();

// GET /portal/factories — list of orgs the customer picker shows
router.get("/factories", async (_req, res) => {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, location: true, portalPin: true },
    orderBy: { name: "asc" },
  });
  res.json(
    orgs.map((o) => ({
      id: o.id,
      name: o.name,
      location: o.location,
      requiresPin: !!o.portalPin,
    }))
  );
});

// POST /portal/login — { organizationId, pin? } → CustomerUser
router.post("/login", async (req, res) => {
  const { organizationId, pin } = req.body as { organizationId?: string; pin?: string };
  if (!organizationId) return res.status(400).json({ error: "organizationId required" });

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return res.status(404).json({ error: "Factory not found" });

  if (org.portalPin) {
    if (!pin) return res.status(401).json({ error: "PIN required" });
    const ok = await bcrypt.compare(pin, org.portalPin);
    if (!ok) return res.status(401).json({ error: "Incorrect PIN" });
  }

  const ie = await prisma.user.findFirst({
    where: { organizationId, role: "IE" },
    orderBy: { name: "asc" },
  });
  if (!ie) return res.status(404).json({ error: "No IE account found for this factory" });

  res.json({
    id: ie.id,
    name: ie.name,
    organizationId: org.id,
    organizationName: org.name,
    role: ie.role,
    groupId: org.groupId ?? null,
  });
});

// POST /portal/set-pin — { organizationId, pin } — FM internal use to set a factory's PIN
router.post("/set-pin", async (req, res) => {
  const { organizationId, pin } = req.body as { organizationId?: string; pin?: string };
  if (!organizationId || !pin) return res.status(400).json({ error: "organizationId and pin required" });
  if (pin.length < 4) return res.status(400).json({ error: "PIN must be at least 4 characters" });

  const hashed = await bcrypt.hash(pin, 10);
  await prisma.organization.update({ where: { id: organizationId }, data: { portalPin: hashed } });
  res.json({ ok: true });
});

export default router;
