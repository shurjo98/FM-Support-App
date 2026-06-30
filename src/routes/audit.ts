// src/routes/audit.ts
import { Router } from "express";
import { prisma } from "../db";
import { storeFile } from "../services/fileStorage";
import express from "express";

const router = Router();

// ─── Checklist template ───────────────────────────────────────────────────────

type AuditCategory = "Machine Maintenance" | "Documentation" | "Safety" | "Operator Compliance";

const CHECKLIST: { category: AuditCategory; question: string; autoFillKey?: string }[] = [
  // Machine Maintenance
  { category: "Machine Maintenance", question: "All machines registered in the portal with serial numbers", autoFillKey: "hasFleet" },
  { category: "Machine Maintenance", question: "All registered machines have a documented service schedule", autoFillKey: "allScheduled" },
  { category: "Machine Maintenance", question: "At least one machine has been serviced within the last 6 months", autoFillKey: "recentlyServiced" },
  { category: "Machine Maintenance", question: "Needle usage and disposal records are maintained", autoFillKey: "hasNeedleRecords" },
  { category: "Machine Maintenance", question: "Spare parts stock list is maintained", autoFillKey: "hasStockRecords" },
  { category: "Machine Maintenance", question: "Service visit records are documented with technician names and dates", autoFillKey: "hasServiceVisits" },
  // Documentation
  { category: "Documentation", question: "Machine purchase certificates are on file" },
  { category: "Documentation", question: "Machine model specification sheets are available" },
  { category: "Documentation", question: "FM technical support contact and escalation process is documented" },
  { category: "Documentation", question: "Vendor contact information is filed and accessible" },
  // Safety
  { category: "Safety", question: "Machine guards are installed and functional on all machines" },
  { category: "Safety", question: "Electrical safety inspection completed within the last 12 months" },
  { category: "Safety", question: "Emergency stop buttons have been tested and are functional" },
  { category: "Safety", question: "Adequate lighting is maintained on the production floor" },
  { category: "Safety", question: "First aid facilities are available near the production area" },
  // Operator Compliance
  { category: "Operator Compliance", question: "Operators are assigned only to machines they are trained for" },
  { category: "Operator Compliance", question: "No unauthorized machine modifications have been observed" },
  { category: "Operator Compliance", question: "Machine speed settings are appropriate for the fabric type being sewn" },
  { category: "Operator Compliance", question: "Needle and bobbin change procedures are documented and followed" },
  { category: "Operator Compliance", question: "Daily operator shift handover process is completed" },
];

// ─── Auto-fill signals derived from existing data ────────────────────────────

async function computeAutoFillSignals(organizationId: string) {
  const instances = await prisma.machineInstance.findMany({ where: { organizationId } });
  const needlePurchases = await prisma.purchase.findMany({
    where: { organizationId, itemType: "NEEDLE" },
    take: 1,
  });
  const stockItems = await prisma.sparePartStock.findMany({
    where: { organizationId },
    take: 1,
  });
  const orgUsers = await prisma.user.findMany({ where: { organizationId }, select: { id: true } });
  const completedTickets = await prisma.ticket.findMany({
    where: { createdByUserId: { in: orgUsers.map((u) => u.id) }, status: "COMPLETED" },
    take: 1,
  });
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  return {
    hasFleet: instances.length > 0,
    allScheduled: instances.length > 0 && instances.every((i) => i.serviceIntervalMonths != null),
    recentlyServiced: instances.some((i) => i.lastServicedAt && i.lastServicedAt >= sixMonthsAgo),
    hasNeedleRecords: needlePurchases.length > 0,
    hasStockRecords: stockItems.length > 0,
    hasServiceVisits: completedTickets.length > 0,
  };
}

// ─── Seed default items for an org if none exist ─────────────────────────────

async function seedIfNeeded(organizationId: string) {
  const existing = await prisma.auditItem.findMany({ where: { organizationId } });
  if (existing.length > 0) return existing;

  const signals = await computeAutoFillSignals(organizationId);
  const now = new Date();

  const items = CHECKLIST.map((tmpl, idx) => {
    const autoFilled = tmpl.autoFillKey ? Boolean(signals[tmpl.autoFillKey as keyof typeof signals]) : false;
    return {
      id: `audit-${organizationId}-${idx}`,
      organizationId,
      category: tmpl.category,
      question: tmpl.question,
      status: autoFilled ? "DONE" : "NOT_DONE",
      autoFilled,
      updatedAt: now,
    };
  });

  await prisma.auditItem.createMany({ data: items });
  return prisma.auditItem.findMany({ where: { organizationId }, orderBy: { id: "asc" } });
}

// ─── GET /audit?organizationId=X ─────────────────────────────────────────────

router.get("/", async (req, res) => {
  const { organizationId } = req.query as { organizationId?: string };
  if (!organizationId) return res.status(400).json({ error: "organizationId required" });

  const items = await seedIfNeeded(organizationId);

  // Re-evaluate auto-filled items on every load
  const signals = await computeAutoFillSignals(organizationId);
  const updates: Promise<unknown>[] = [];

  for (const item of items) {
    const tmpl = CHECKLIST.find((t) => t.question === item.question);
    if (!tmpl?.autoFillKey) continue;
    const shouldBeDone = Boolean(signals[tmpl.autoFillKey as keyof typeof signals]);
    const currentDone = item.status === "DONE";
    if (shouldBeDone !== currentDone) {
      updates.push(
        prisma.auditItem.update({
          where: { id: item.id },
          data: { status: shouldBeDone ? "DONE" : "NOT_DONE", autoFilled: true },
        })
      );
    }
  }
  if (updates.length > 0) await Promise.all(updates);

  const fresh = await prisma.auditItem.findMany({ where: { organizationId }, orderBy: { id: "asc" } });
  const done = fresh.filter((i) => i.status === "DONE").length;

  res.json({ items: fresh, total: fresh.length, done, pct: Math.round((done / fresh.length) * 100) });
});

// ─── PATCH /audit/:itemId ─────────────────────────────────────────────────────

router.patch("/:itemId", async (req, res) => {
  const { status, notes } = req.body as { status?: string; notes?: string };
  const updated = await prisma.auditItem.update({
    where: { id: req.params.itemId },
    data: {
      ...(status ? { status, autoFilled: false } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  });
  res.json(updated);
});

// ─── POST /audit/:itemId/document ────────────────────────────────────────────

router.post(
  "/:itemId/document",
  express.raw({ type: ["image/*", "application/pdf"], limit: "10mb" }),
  async (req, res) => {
    const contentType = req.headers["content-type"] ?? "application/octet-stream";
    const data = req.body as Buffer;
    if (!data?.length) return res.status(400).json({ error: "No file body" });

    const url = await storeFile(data, contentType);
    const updated = await prisma.auditItem.update({
      where: { id: req.params.itemId },
      data: { documentUrl: url, status: "DONE", autoFilled: false },
    });
    res.json(updated);
  }
);

export default router;
