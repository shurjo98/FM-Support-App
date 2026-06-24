// src/routes/machines.ts
import { Router } from "express";
import { prisma } from "../db";
import type { ProductLine } from "../types";

const router = Router();

// GET /machines -> list machine models, optionally filtered by ?productLine=
// and/or ?organizationId= (only machines that factory actually owns —
// used by the report-issue flow so every card shown is reportable).
router.get("/", async (req, res) => {
  const { productLine, organizationId } = req.query as { productLine?: ProductLine; organizationId?: string };
  const rows = await prisma.machine.findMany({
    where: {
      ...(productLine ? { productLine } : {}),
      ...(organizationId ? { organizationId } : {}),
    },
  });
  res.json(rows);
});

// GET /machines/:machineId/instances -> list serials for one machine,
// optionally restricted to the customer's own factory via ?organizationId=
router.get("/:machineId/instances", async (req, res) => {
  const { machineId } = req.params;
  const { organizationId } = req.query as { organizationId?: string };
  const list = await prisma.machineInstance.findMany({
    where: {
      machineId,
      ...(organizationId ? { organizationId } : {}),
    },
  });
  res.json(list);
});

export default router;
