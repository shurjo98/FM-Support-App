// src/routes/users.ts
import { Router } from "express";
import { prisma } from "../db";

const router = Router();

// GET /users -> accounts available to act as the logged-in customer, with
// their factory name attached, since the customer dashboard doesn't have
// real login yet. Only IEs can use the customer portal — operators don't
// get a dashboard view at all — so only IE accounts are listed here.
router.get("/", async (req, res) => {
  const ies = await prisma.user.findMany({
    where: { role: "IE" },
    include: { organization: true },
  });
  const rows = ies.map((u) => ({
    id: u.id,
    name: u.name,
    organizationId: u.organizationId,
    organizationName: u.organization?.name ?? u.organizationId,
    role: u.role,
    groupId: u.organization?.groupId ?? null,
  }));
  res.json(rows);
});

export default router;
