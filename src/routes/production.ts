// src/routes/production.ts
import { Router } from "express";
import { prisma } from "../db";

const router = Router();

function mkId() {
  return `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// GET /production?organizationId=X&days=30
router.get("/", async (req, res) => {
  const { organizationId, days } = req.query as { organizationId?: string; days?: string };
  if (!organizationId) return res.status(400).json({ error: "organizationId required" });

  const since = new Date();
  since.setDate(since.getDate() - (Number(days) || 30));

  const logs = await prisma.productionLog.findMany({
    where: { organizationId, loggedAt: { gte: since } },
    orderBy: { loggedAt: "desc" },
  });

  // Per-machine summary
  const byMachine: Record<string, { serialNumber: string; machineName: string; total: number }> = {};
  for (const log of logs) {
    const key = log.serialNumber ?? log.machineName ?? "Unknown";
    if (!byMachine[key]) {
      byMachine[key] = {
        serialNumber: log.serialNumber ?? "—",
        machineName: log.machineName ?? log.serialNumber ?? "Unknown",
        total: 0,
      };
    }
    byMachine[key].total += log.quantity;
  }

  res.json({
    logs: logs.map((l) => ({ ...l, loggedAt: l.loggedAt.toISOString() })),
    machineSummary: Object.values(byMachine).sort((a, b) => b.total - a.total),
    totalProduced: logs.reduce((s, l) => s + l.quantity, 0),
  });
});

// POST /production — log a production-count entry
router.post("/", async (req, res) => {
  const { organizationId, serialNumber, machineName, quantity, shift, loggedByUserId } = req.body as {
    organizationId: string;
    serialNumber?: string;
    machineName?: string;
    quantity: number;
    shift: string;
    loggedByUserId?: string;
  };

  if (!organizationId || !quantity || !shift) {
    return res.status(400).json({ error: "organizationId, quantity and shift are required" });
  }

  const entry = await prisma.productionLog.create({
    data: {
      id: mkId(),
      organizationId,
      serialNumber: serialNumber ?? null,
      machineName: machineName ?? null,
      quantity,
      shift,
      loggedByUserId: loggedByUserId ?? null,
    },
  });

  res.status(201).json({ ...entry, loggedAt: entry.loggedAt.toISOString() });
});

export default router;
