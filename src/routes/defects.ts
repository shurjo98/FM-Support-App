// src/routes/defects.ts
import { Router } from "express";
import { prisma } from "../db";

const router = Router();

function mkId() {
  return `def-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// GET /defects?organizationId=X&days=30
router.get("/", async (req, res) => {
  const { organizationId, days } = req.query as { organizationId?: string; days?: string };
  if (!organizationId) return res.status(400).json({ error: "organizationId required" });

  const since = new Date();
  since.setDate(since.getDate() - (Number(days) || 30));

  const logs = await prisma.defectLog.findMany({
    where: { organizationId, loggedAt: { gte: since } },
    orderBy: { loggedAt: "desc" },
  });

  // Per-machine summary
  const byMachine: Record<string, { serialNumber: string; machineName: string; total: number; byType: Record<string, number> }> = {};
  for (const log of logs) {
    const key = log.serialNumber ?? log.machineName ?? "Unknown";
    if (!byMachine[key]) {
      byMachine[key] = {
        serialNumber: log.serialNumber ?? "—",
        machineName: log.machineName ?? log.serialNumber ?? "Unknown",
        total: 0,
        byType: {},
      };
    }
    byMachine[key].total += log.count;
    byMachine[key].byType[log.defectType] = (byMachine[key].byType[log.defectType] ?? 0) + log.count;
  }

  const machineSummary = Object.values(byMachine)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Simple anomaly: flag any machine whose last-7-days count > 2× its prior-23-days daily average
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const anomalies: string[] = [];
  for (const [key, data] of Object.entries(byMachine)) {
    const recent = logs.filter((l) => (l.serialNumber ?? l.machineName ?? "Unknown") === key && l.loggedAt >= sevenDaysAgo);
    const older = logs.filter((l) => (l.serialNumber ?? l.machineName ?? "Unknown") === key && l.loggedAt < sevenDaysAgo);
    const recentTotal = recent.reduce((s, l) => s + l.count, 0);
    const olderDailyAvg = older.reduce((s, l) => s + l.count, 0) / 23;
    if (olderDailyAvg > 0 && recentTotal / 7 > olderDailyAvg * 2) {
      anomalies.push(data.machineName);
    }
  }

  res.json({
    logs: logs.map((l) => ({ ...l, loggedAt: l.loggedAt.toISOString() })),
    machineSummary,
    anomalies,
    totalDefects: logs.reduce((s, l) => s + l.count, 0),
  });
});

// POST /defects  — log a defect entry
router.post("/", async (req, res) => {
  const { organizationId, serialNumber, machineName, defectType, count, shift, loggedByUserId } = req.body as {
    organizationId: string;
    serialNumber?: string;
    machineName?: string;
    defectType: string;
    count: number;
    shift: string;
    loggedByUserId?: string;
  };

  if (!organizationId || !defectType || !count || !shift) {
    return res.status(400).json({ error: "organizationId, defectType, count and shift are required" });
  }

  const entry = await prisma.defectLog.create({
    data: {
      id: mkId(),
      organizationId,
      serialNumber: serialNumber ?? null,
      machineName: machineName ?? null,
      defectType,
      count,
      shift,
      loggedByUserId: loggedByUserId ?? null,
    },
  });

  res.status(201).json({ ...entry, loggedAt: entry.loggedAt.toISOString() });
});

export default router;
