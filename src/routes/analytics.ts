// src/routes/analytics.ts
import { Router } from "express";
import { prisma } from "../db";

const router = Router();

// ─── helpers ─────────────────────────────────────────────────────────────────

function serviceStatus(
  lastServicedAt: Date | null,
  serviceIntervalMonths: number | null
): { status: "ok" | "due_soon" | "overdue" | "unscheduled"; nextServiceDue: string | null } {
  if (!lastServicedAt || !serviceIntervalMonths) return { status: "unscheduled", nextServiceDue: null };
  const due = new Date(lastServicedAt);
  due.setMonth(due.getMonth() + serviceIntervalMonths);
  const daysUntilDue = (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  const status = daysUntilDue < 0 ? "overdue" : daysUntilDue <= 14 ? "due_soon" : "ok";
  return { status, nextServiceDue: due.toISOString() };
}

// Resolution time = the STATUS_CHANGED event that mentions "COMPLETED"
function resolutionTime(events: { type: string; description: string; createdAt: Date }[]): Date | null {
  const ev = events
    .filter((e) => e.type === "STATUS_CHANGED" && e.description.toLowerCase().includes("completed"))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  return ev ? ev.createdAt : null;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function last6Months(): string[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return monthKey(d);
  });
}

// ─── GET /analytics/overview ─────────────────────────────────────────────────

router.get("/overview", async (req, res) => {
  const { organizationId } = req.query as { organizationId?: string };
  if (!organizationId) return res.status(400).json({ error: "organizationId required" });

  const orgUsers = await prisma.user.findMany({
    where: { organizationId },
    select: { id: true },
  });
  const userIds = orgUsers.map((u) => u.id);

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const tickets = await prisma.ticket.findMany({
    where: { createdByUserId: { in: userIds } },
    include: { events: true },
  });

  // Downtime per machine (all-time, for top-offenders list)
  const machineDowntime: Record<string, { serialNumber: string; label: string; hours: number; count: number }> = {};

  let thisMonthDowntimeHours = 0;
  let totalResolvedHours = 0;
  let resolvedCount = 0;

  for (const ticket of tickets) {
    if (ticket.status !== "COMPLETED") continue;
    const resolvedAt = resolutionTime(ticket.events);
    if (!resolvedAt) continue;

    const hours = (resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
    totalResolvedHours += hours;
    resolvedCount++;

    if (ticket.createdAt >= firstOfMonth) thisMonthDowntimeHours += hours;

    const key = ticket.serialNumber ?? ticket.customMachineName ?? "Unknown";
    if (!machineDowntime[key]) {
      machineDowntime[key] = {
        serialNumber: ticket.serialNumber ?? "—",
        label: ticket.customMachineName ?? ticket.serialNumber ?? "Unknown",
        hours: 0,
        count: 0,
      };
    }
    machineDowntime[key].hours += hours;
    machineDowntime[key].count++;
  }

  const avgResolutionHours = resolvedCount > 0 ? totalResolvedHours / resolvedCount : 0;

  const topMachines = Object.values(machineDowntime)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5)
    .map((m) => ({ ...m, hours: Math.round(m.hours * 10) / 10 }));

  // Fleet health
  const instances = await prisma.machineInstance.findMany({ where: { organizationId } });
  const fleet = { total: instances.length, ok: 0, due_soon: 0, overdue: 0, unscheduled: 0 };
  for (const inst of instances) {
    const { status } = serviceStatus(inst.lastServicedAt, inst.serviceIntervalMonths);
    fleet[status]++;
  }

  // Needle spend this month vs last month
  const needlePurchases = await prisma.purchase.findMany({
    where: { organizationId, itemType: "NEEDLE" },
  });
  const thisMonthKey = monthKey(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = monthKey(lastMonthDate);

  const needleSpendThisMonth = needlePurchases
    .filter((p) => p.purchaseDate.startsWith(thisMonthKey))
    .reduce((s, p) => s + p.quantity * p.unitPrice, 0);
  const needleSpendLastMonth = needlePurchases
    .filter((p) => p.purchaseDate.startsWith(lastMonthKey))
    .reduce((s, p) => s + p.quantity * p.unitPrice, 0);

  res.json({
    thisMonthDowntimeHours: Math.round(thisMonthDowntimeHours * 10) / 10,
    avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
    openTickets: tickets.filter((t) => t.status === "OPEN").length,
    inProgressTickets: tickets.filter((t) => t.status === "IN_PROGRESS").length,
    totalTickets: tickets.length,
    fleet,
    needleSpendThisMonth: Math.round(needleSpendThisMonth),
    needleSpendLastMonth: Math.round(needleSpendLastMonth),
    topMachines,
  });
});

// ─── GET /analytics/fleet ─────────────────────────────────────────────────────

router.get("/fleet", async (req, res) => {
  const { organizationId } = req.query as { organizationId?: string };
  if (!organizationId) return res.status(400).json({ error: "organizationId required" });

  const instances = await prisma.machineInstance.findMany({
    where: { organizationId },
    include: { machine: true },
    orderBy: [{ location: "asc" }, { id: "asc" }],
  });

  const rows = instances.map((i) => {
    const { status, nextServiceDue } = serviceStatus(i.lastServicedAt, i.serviceIntervalMonths);
    return {
      id: i.id,
      serialNumber: i.serialNumber,
      displayName: i.machine?.name ?? i.customName ?? "Unknown Machine",
      displayBrand: i.machine?.brand ?? i.brand ?? "Unknown",
      displayCategory: i.machine?.category ?? i.category ?? null,
      productLine: i.machine?.productLine ?? null,
      location: i.location,
      lastServicedAt: i.lastServicedAt?.toISOString() ?? null,
      serviceIntervalMonths: i.serviceIntervalMonths,
      nextServiceDue,
      serviceStatus: status,
      isCatalogMachine: Boolean(i.machineId),
    };
  });

  res.json(rows);
});

// ─── GET /analytics/needles ───────────────────────────────────────────────────

router.get("/needles", async (req, res) => {
  const { organizationId } = req.query as { organizationId?: string };
  if (!organizationId) return res.status(400).json({ error: "organizationId required" });

  const purchases = await prisma.purchase.findMany({
    where: { organizationId, itemType: "NEEDLE" },
    orderBy: { purchaseDate: "asc" },
  });

  const byMonth: Record<string, { month: string; quantity: number; spend: number; items: string[] }> = {};
  for (const p of purchases) {
    const key = p.purchaseDate.substring(0, 7);
    if (!byMonth[key]) byMonth[key] = { month: key, quantity: 0, spend: 0, items: [] };
    byMonth[key].quantity += p.quantity;
    byMonth[key].spend += Math.round(p.quantity * p.unitPrice);
    if (!byMonth[key].items.includes(p.itemName)) byMonth[key].items.push(p.itemName);
  }

  const months = last6Months();
  const result = months.map((m) => byMonth[m] ?? { month: m, quantity: 0, spend: 0, items: [] });

  const last5Avg = result.slice(0, 5).reduce((s, r) => s + r.quantity, 0) / 5;
  const currentQty = result.at(-1)?.quantity ?? 0;
  const isAnomaly = last5Avg > 0 && currentQty > last5Avg * 1.5;

  res.json({ months: result, last5Avg: Math.round(last5Avg), isAnomaly });
});

// ─── GET /analytics/compliance.pdf ───────────────────────────────────────────

router.get("/compliance.pdf", async (req, res) => {
  const { organizationId } = req.query as { organizationId?: string };
  if (!organizationId) return res.status(400).json({ error: "organizationId required" });

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return res.status(404).json({ error: "Organization not found" });

  const instances = await prisma.machineInstance.findMany({
    where: { organizationId },
    include: { machine: true },
    orderBy: [{ location: "asc" }, { id: "asc" }],
  });

  const orgUsers = await prisma.user.findMany({ where: { organizationId }, select: { id: true } });
  const userIds = orgUsers.map((u) => u.id);
  const tickets = await prisma.ticket.findMany({
    where: { createdByUserId: { in: userIds } },
    include: { events: true },
    orderBy: { createdAt: "desc" },
  });

  // Count tickets per serial number
  const ticketCountBySN: Record<string, number> = {};
  for (const t of tickets) {
    if (t.serialNumber) {
      ticketCountBySN[t.serialNumber] = (ticketCountBySN[t.serialNumber] ?? 0) + 1;
    }
  }

  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  const safeOrgName = org.name.replace(/[^a-zA-Z0-9]/g, "-");
  const dateStr = new Date().toISOString().split("T")[0];

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="fm-compliance-${safeOrgName}-${dateStr}.pdf"`
  );
  doc.pipe(res);

  // ── Header ──
  const BRAND = "#1d4ed8";

  doc.rect(0, 0, doc.page.width, 90).fill(BRAND);
  doc.fillColor("white").fontSize(22).font("Helvetica-Bold").text("FM Corporation", 50, 24);
  doc.fontSize(11).font("Helvetica").text("Machine Maintenance Compliance Report", 50, 54);

  doc.fillColor("#111").fontSize(11).font("Helvetica");
  doc.text(`Factory: ${org.name}`, 50, 108);
  doc.text(`Location: ${org.location ?? "—"}`, 50, 124);
  doc.text(`Report date: ${new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}`, 50, 140);
  doc.text(`Total machines: ${instances.length}`, 50, 156);

  // ── Fleet health summary ──
  const health = { ok: 0, due_soon: 0, overdue: 0, unscheduled: 0 };
  for (const inst of instances) {
    const { status } = serviceStatus(inst.lastServicedAt, inst.serviceIntervalMonths);
    health[status]++;
  }

  doc.moveDown(2);
  doc.fontSize(13).font("Helvetica-Bold").fillColor(BRAND).text("Fleet Health Summary");
  doc.moveDown(0.4);
  doc.fontSize(10).font("Helvetica").fillColor("#111");

  const summaryRows = [
    ["Serviced & up to date", health.ok],
    ["Service due within 14 days", health.due_soon],
    ["Service overdue", health.overdue],
    ["No maintenance schedule set", health.unscheduled],
  ] as const;

  for (const [label, count] of summaryRows) {
    doc.text(`${label}:  ${count} machine${count !== 1 ? "s" : ""}`, { indent: 16 });
  }

  // ── Machine table ──
  doc.moveDown(1.5);
  doc.fontSize(13).font("Helvetica-Bold").fillColor(BRAND).text("Machine Register");
  doc.moveDown(0.5);

  const COL = { sn: 50, name: 130, location: 255, lastService: 340, nextDue: 430, status: 510 };
  const ROW_H = 18;

  // Table header
  doc.rect(45, doc.y, doc.page.width - 90, ROW_H).fill("#e8eef8");
  const headerY = doc.y + 4;
  doc
    .fillColor(BRAND)
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("Serial #", COL.sn, headerY)
    .text("Machine", COL.name, headerY)
    .text("Location", COL.location, headerY)
    .text("Last Service", COL.lastService, headerY)
    .text("Next Due", COL.nextDue, headerY)
    .text("Status", COL.status, headerY);

  doc.moveDown(0.1);

  const STATUS_LABEL: Record<string, string> = {
    ok: "OK",
    due_soon: "DUE SOON",
    overdue: "OVERDUE",
    unscheduled: "UNSCHEDULED",
  };

  let rowIdx = 0;
  for (const inst of instances) {
    const { status, nextServiceDue } = serviceStatus(inst.lastServicedAt, inst.serviceIntervalMonths);
    const displayName = inst.machine?.name ?? inst.customName ?? "Unknown";
    const location = inst.location ?? "—";
    const lastServiced = inst.lastServicedAt
      ? new Date(inst.lastServicedAt).toLocaleDateString("en-GB")
      : "Never";
    const nextDue = nextServiceDue ? new Date(nextServiceDue).toLocaleDateString("en-GB") : "—";

    if (rowIdx % 2 === 0) {
      doc.rect(45, doc.y, doc.page.width - 90, ROW_H).fill("#f9fafb");
    }
    rowIdx++;

    const rowY = doc.y + 4;
    const statusColor = status === "ok" ? "#16a34a" : status === "due_soon" ? "#d97706" : status === "overdue" ? "#dc2626" : "#6b7280";
    const statusLabel = STATUS_LABEL[status] ?? status.toUpperCase();

    doc
      .fillColor("#111")
      .fontSize(8)
      .font("Helvetica")
      .text(inst.serialNumber, COL.sn, rowY, { width: 78 })
      .text(displayName, COL.name, rowY, { width: 118 })
      .text(location, COL.location, rowY, { width: 80 })
      .text(lastServiced, COL.lastService, rowY, { width: 84 })
      .text(nextDue, COL.nextDue, rowY, { width: 72 })
      .fillColor(statusColor)
      .font("Helvetica-Bold")
      .text(statusLabel, COL.status, rowY, { width: 72 });

    doc.moveDown(0.1);

    // Page break if needed
    if (doc.y > doc.page.height - 80) {
      doc.addPage();
      doc.moveDown(0.5);
    }
  }

  // ── Footer ──
  doc
    .fillColor("#9ca3af")
    .fontSize(8)
    .font("Helvetica")
    .text(
      `This report was generated automatically by FM Factory Support Portal on ${new Date().toLocaleString("en-GB")}.`,
      50,
      doc.page.height - 50,
      { align: "center", width: doc.page.width - 100 }
    );

  doc.end();
});

// ─── GET /analytics/group?groupId=X ─────────────────────────────────────────
// Multi-factory overview for owners that have multiple orgs in the same group.

router.get("/group", async (req, res) => {
  const { groupId } = req.query as { groupId?: string };
  if (!groupId) return res.status(400).json({ error: "groupId required" });

  const orgs = await prisma.organization.findMany({ where: { groupId } });
  if (orgs.length === 0) return res.status(404).json({ error: "No organisations found for this group" });

  const results = await Promise.all(
    orgs.map(async (org) => {
      const users = await prisma.user.findMany({ where: { organizationId: org.id }, select: { id: true } });
      const userIds = users.map((u) => u.id);

      const tickets = await prisma.ticket.findMany({
        where: { createdByUserId: { in: userIds } },
        include: { events: true },
      });

      const instances = await prisma.machineInstance.findMany({ where: { organizationId: org.id } });
      const fleet = { total: instances.length, ok: 0, due_soon: 0, overdue: 0, unscheduled: 0 };
      for (const inst of instances) {
        const { status } = serviceStatus(inst.lastServicedAt, inst.serviceIntervalMonths);
        fleet[status]++;
      }

      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      let thisMonthDowntime = 0;
      for (const t of tickets) {
        if (t.status !== "COMPLETED" || t.createdAt < firstOfMonth) continue;
        const ev = t.events
          .filter((e) => e.type === "STATUS_CHANGED" && e.description.toLowerCase().includes("completed"))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        if (ev) thisMonthDowntime += (ev.createdAt.getTime() - t.createdAt.getTime()) / 3_600_000;
      }

      const needleSpend = await prisma.purchase.findMany({
        where: { organizationId: org.id, itemType: "NEEDLE" },
      });
      const thisMonthKey = monthKey(now);
      const needleSpendThisMonth = needleSpend
        .filter((p) => p.purchaseDate.startsWith(thisMonthKey))
        .reduce((s, p) => s + p.quantity * p.unitPrice, 0);

      return {
        id: org.id,
        name: org.name,
        location: org.location,
        openTickets: tickets.filter((t) => t.status === "OPEN").length,
        inProgressTickets: tickets.filter((t) => t.status === "IN_PROGRESS").length,
        totalTickets: tickets.length,
        thisMonthDowntimeHours: Math.round(thisMonthDowntime * 10) / 10,
        fleet,
        needleSpendThisMonth: Math.round(needleSpendThisMonth),
      };
    })
  );

  res.json({ groupId, factories: results });
});

export default router;
