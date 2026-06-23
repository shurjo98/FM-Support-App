// src/routes/users.ts
import { Router } from "express";
import { users, organizations } from "../store";

const router = Router();

// GET /users -> workers available to act as the logged-in customer, with
// their factory name attached, since the customer dashboard doesn't have
// real login yet.
router.get("/", (req, res) => {
  const rows = users.map((u) => ({
    id: u.id,
    name: u.name,
    organizationId: u.organizationId,
    organizationName: organizations.find((o) => o.id === u.organizationId)?.name ?? u.organizationId,
    role: u.role,
  }));
  res.json(rows);
});

export default router;
