import { Router } from "express";
import { prisma } from "../db";

const router = Router();

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
