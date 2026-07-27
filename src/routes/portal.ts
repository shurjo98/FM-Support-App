import { Router } from "express";
import { prisma } from "../db";

const router = Router();

// TEMPORARY diagnostic route — remove after debugging the production
// "FM"/"1111" login issue. Never exposes portalPassword values, only
// whether a portalUserId is set and what it equals.
router.get("/debug-orgs", async (_req, res) => {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, portalUserId: true },
  });
  const [conn] = await prisma.$queryRaw<{ db: string; addr: string; port: number }[]>`
    SELECT current_database() as db, inet_server_addr()::text as addr, inet_server_port() as port
  `;
  res.json({ connectedTo: conn, count: orgs.length, orgs });
});

// POST /portal/login — { userId } → CustomerUser
// Password check removed for the pilot (see settings.demoNotice in the
// frontend — this was always a stand-in account picker, not real customer
// auth). portalPassword stays in the schema/admin UI for later re-enabling.
router.post("/login", async (req, res) => {
  const { userId } = req.body as { userId?: string };
  if (!userId) return res.status(400).json({ error: "userId required" });

  const org = await prisma.organization.findFirst({ where: { portalUserId: userId } });
  if (!org) {
    return res.status(401).json({ error: "Unknown user ID" });
  }

  const ie = await prisma.user.findFirst({
    where: { organizationId: org.id, role: "IE" },
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

export default router;
