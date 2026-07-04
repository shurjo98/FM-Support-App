import { Router } from "express";
import { prisma } from "../db";

const router = Router();

// POST /portal/login — { userId, password } → CustomerUser
router.post("/login", async (req, res) => {
  const { userId, password } = req.body as { userId?: string; password?: string };
  if (!userId || !password) return res.status(400).json({ error: "userId and password required" });

  const org = await prisma.organization.findFirst({ where: { portalUserId: userId } });
  if (!org || org.portalPassword !== password) {
    return res.status(401).json({ error: "Incorrect user ID or password" });
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
