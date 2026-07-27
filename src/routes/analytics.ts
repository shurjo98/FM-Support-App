// src/routes/analytics.ts
import { Router } from "express";
import { prisma } from "../db";
import { maintenanceStatus } from "./maintenance";

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

// ─── Hidden cost of downtime ─────────────────────────────────────────────────
// "Hidden" = the part that isn't obvious from a repair ticket: lost
// production (the machine wasn't making anything) plus idle labor (the
// operator still got paid while it sat broken). Assumptions are editable
// per-factory (see PATCH /hidden-cost-settings below); these are just the
// starting defaults shown until an org sets its own.
const DEFAULT_COST_SETTINGS = {
  piecesPerHour: 60,
  pricePerPiece: 50,
  workersPerMachine: 1,
  hourlyWage: 50,
};

function resolveCostSettings(org: {
  costPiecesPerHour: number | null;
  costPricePerPiece: number | null;
  costWorkersPerMachine: number | null;
  costHourlyWage: number | null;
}) {
  return {
    piecesPerHour: org.costPiecesPerHour ?? DEFAULT_COST_SETTINGS.piecesPerHour,
    pricePerPiece: org.costPricePerPiece ?? DEFAULT_COST_SETTINGS.pricePerPiece,
    workersPerMachine: org.costWorkersPerMachine ?? DEFAULT_COST_SETTINGS.workersPerMachine,
    hourlyWage: org.costHourlyWage ?? DEFAULT_COST_SETTINGS.hourlyWage,
  };
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

// ─── GET /analytics/hidden-cost ──────────────────────────────────────────────

router.get("/hidden-cost", async (req, res) => {
  const { organizationId } = req.query as { organizationId?: string };
  if (!organizationId) return res.status(400).json({ error: "organizationId required" });

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return res.status(404).json({ error: "Organization not found" });

  const settings = resolveCostSettings(org);

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const orgUsers = await prisma.user.findMany({ where: { organizationId }, select: { id: true } });
  const userIds = orgUsers.map((u) => u.id);
  const tickets = await prisma.ticket.findMany({
    where: { createdByUserId: { in: userIds } },
    include: { events: true },
  });

  const byMachine: Record<string, { label: string; hours: number }> = {};
  let thisMonthDowntimeHours = 0;

  for (const ticket of tickets) {
    if (ticket.status !== "COMPLETED") continue;
    const resolvedAt = resolutionTime(ticket.events);
    if (!resolvedAt || ticket.createdAt < firstOfMonth) continue;

    const hours = (resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
    thisMonthDowntimeHours += hours;

    const key = ticket.serialNumber ?? ticket.customMachineName ?? "Unknown";
    if (!byMachine[key]) byMachine[key] = { label: ticket.customMachineName ?? ticket.serialNumber ?? "Unknown", hours: 0 };
    byMachine[key].hours += hours;
  }

  function costFor(hours: number) {
    const lostProductionValue = hours * settings.piecesPerHour * settings.pricePerPiece;
    const idleLaborCost = hours * settings.workersPerMachine * settings.hourlyWage;
    return { lostProductionValue: Math.round(lostProductionValue), idleLaborCost: Math.round(idleLaborCost) };
  }

  const totals = costFor(thisMonthDowntimeHours);

  const byMachineBreakdown = Object.values(byMachine)
    .map((m) => ({ label: m.label, hours: Math.round(m.hours * 10) / 10, ...costFor(m.hours) }))
    .sort((a, b) => b.lostProductionValue + b.idleLaborCost - (a.lostProductionValue + a.idleLaborCost))
    .slice(0, 5);

  res.json({
    settings,
    thisMonthDowntimeHours: Math.round(thisMonthDowntimeHours * 10) / 10,
    lostProductionValue: totals.lostProductionValue,
    idleLaborCost: totals.idleLaborCost,
    totalHiddenCost: totals.lostProductionValue + totals.idleLaborCost,
    byMachine: byMachineBreakdown,
  });
});

// ─── PATCH /analytics/hidden-cost-settings ───────────────────────────────────

router.patch("/hidden-cost-settings", async (req, res) => {
  const { organizationId, piecesPerHour, pricePerPiece, workersPerMachine, hourlyWage } = req.body as {
    organizationId?: string;
    piecesPerHour?: number;
    pricePerPiece?: number;
    workersPerMachine?: number;
    hourlyWage?: number;
  };
  if (!organizationId) return res.status(400).json({ error: "organizationId required" });

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ...(piecesPerHour != null ? { costPiecesPerHour: piecesPerHour } : {}),
      ...(pricePerPiece != null ? { costPricePerPiece: pricePerPiece } : {}),
      ...(workersPerMachine != null ? { costWorkersPerMachine: workersPerMachine } : {}),
      ...(hourlyWage != null ? { costHourlyWage: hourlyWage } : {}),
    },
  });

  res.json({ settings: resolveCostSettings(updated) });
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

// ─── GET /analytics/andon ─────────────────────────────────────────────────────
// Toyota andon-cord signal, digitized: instead of an IE reading through the
// ticket list to figure out what's actually down right now, every machine is
// red/amber/green at a glance. Red = an unresolved ticket exists right now
// (the same "no resolutionTime yet" signal /overview uses to skip a ticket
// from downtime totals). Amber = service due/overdue (serviceStatus(), reused
// as-is) or an abnormal defect rate (same 2x-recent-vs-prior-average check
// defects.ts uses, duplicated here rather than extracted — matches this
// codebase's existing convention of duplicating small per-route calcs).

router.get("/andon", async (req, res) => {
  const { organizationId } = req.query as { organizationId?: string };
  if (!organizationId) return res.status(400).json({ error: "organizationId required" });

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
  });

  const openIssueBySerial: Record<string, string> = {};
  for (const ticket of tickets) {
    if (ticket.status === "COMPLETED") continue;
    if (resolutionTime(ticket.events)) continue; // resolved but status not yet flipped — treat as not open
    const key = ticket.serialNumber ?? ticket.customMachineName;
    if (key) openIssueBySerial[key] = ticket.issueType;
  }

  // Defect-rate anomaly, same threshold as defects.ts's GET /defects.
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const defectLogs = await prisma.defectLog.findMany({
    where: { organizationId, loggedAt: { gte: thirtyDaysAgo } },
  });
  const anomalousSerials = new Set<string>();
  const bySerial: Record<string, { recent: number; older: number }> = {};
  for (const log of defectLogs) {
    const key = log.serialNumber ?? log.machineName ?? "Unknown";
    if (!bySerial[key]) bySerial[key] = { recent: 0, older: 0 };
    if (log.loggedAt >= sevenDaysAgo) bySerial[key].recent += log.count;
    else bySerial[key].older += log.count;
  }
  for (const [key, d] of Object.entries(bySerial)) {
    const olderDailyAvg = d.older / 23;
    if (olderDailyAvg > 0 && d.recent / 7 > olderDailyAvg * 2) anomalousSerials.add(key);
  }

  const summary = { red: 0, amber: 0, green: 0 };
  const machines = instances.map((i) => {
    const { status: svcStatus } = serviceStatus(i.lastServicedAt, i.serviceIntervalMonths);
    const displayName = i.machine?.name ?? i.customName ?? "Unknown Machine";
    const openIssueType = openIssueBySerial[i.serialNumber];
    const isAnomalous = anomalousSerials.has(i.serialNumber) || anomalousSerials.has(displayName);

    let andonStatus: "red" | "amber" | "green" = "green";
    let reason = "Running normally";
    if (openIssueType) {
      andonStatus = "red";
      reason = `Open issue: ${openIssueType.replaceAll("_", " ").toLowerCase()}`;
    } else if (svcStatus === "overdue") {
      andonStatus = "amber";
      reason = "Service overdue";
    } else if (svcStatus === "due_soon") {
      andonStatus = "amber";
      reason = "Service due soon";
    } else if (isAnomalous) {
      andonStatus = "amber";
      reason = "Defect rate abnormally high";
    }
    summary[andonStatus]++;

    return {
      id: i.id,
      serialNumber: i.serialNumber,
      displayName,
      location: i.location,
      andonStatus,
      reason,
    };
  });

  res.json({ machines, summary });
});

// ─── GET /analytics/oee ───────────────────────────────────────────────────────
// OEE = Availability × Performance × Quality. Availability/downtime reuses
// the exact resolved-ticket-hours logic from /overview and /hidden-cost;
// Performance and Quality are only meaningful once ProductionLog entries
// exist (paired with DefectLog on the same end-of-shift form) — with none
// logged yet, Performance is honestly 0 rather than a faked/omitted number.

const PLANNED_HOURS_PER_MACHINE_THIS_MONTH = 26 * 8; // 26 working days × 8h, matching the existing "26 working days/month" assumption used elsewhere in this app (see RoboticsPage.tsx)

router.get("/oee", async (req, res) => {
  const { organizationId } = req.query as { organizationId?: string };
  if (!organizationId) return res.status(400).json({ error: "organizationId required" });

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return res.status(404).json({ error: "Organization not found" });
  const { piecesPerHour } = resolveCostSettings(org);

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const instances = await prisma.machineInstance.findMany({
    where: { organizationId },
    include: { machine: true },
  });

  const orgUsers = await prisma.user.findMany({ where: { organizationId }, select: { id: true } });
  const userIds = orgUsers.map((u) => u.id);
  const tickets = await prisma.ticket.findMany({
    where: { createdByUserId: { in: userIds } },
    include: { events: true },
  });

  const downtimeBySerial: Record<string, number> = {};
  for (const ticket of tickets) {
    if (ticket.status !== "COMPLETED") continue;
    const resolvedAt = resolutionTime(ticket.events);
    if (!resolvedAt || ticket.createdAt < firstOfMonth) continue;
    const hours = (resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
    const key = ticket.serialNumber ?? ticket.customMachineName ?? "Unknown";
    downtimeBySerial[key] = (downtimeBySerial[key] ?? 0) + hours;
  }

  const productionLogs = await prisma.productionLog.findMany({
    where: { organizationId, loggedAt: { gte: firstOfMonth } },
  });
  const producedBySerial: Record<string, number> = {};
  for (const log of productionLogs) {
    const key = log.serialNumber ?? log.machineName ?? "Unknown";
    producedBySerial[key] = (producedBySerial[key] ?? 0) + log.quantity;
  }

  const defectLogs = await prisma.defectLog.findMany({
    where: { organizationId, loggedAt: { gte: firstOfMonth } },
  });
  const defectsBySerial: Record<string, number> = {};
  for (const log of defectLogs) {
    const key = log.serialNumber ?? log.machineName ?? "Unknown";
    defectsBySerial[key] = (defectsBySerial[key] ?? 0) + log.count;
  }

  function oeeFor(downtimeHours: number, produced: number, defects: number) {
    const plannedHours = PLANNED_HOURS_PER_MACHINE_THIS_MONTH;
    const runtimeHours = Math.max(0, plannedHours - downtimeHours);
    const availability = plannedHours > 0 ? runtimeHours / plannedHours : 0;
    const theoreticalMax = runtimeHours * piecesPerHour;
    const performance = theoreticalMax > 0 ? Math.min(1, produced / theoreticalMax) : 0;
    const quality = produced > 0 ? Math.max(0, (produced - defects) / produced) : 0;
    return {
      availability: Math.round(availability * 1000) / 10,
      performance: Math.round(performance * 1000) / 10,
      quality: Math.round(quality * 1000) / 10,
      oee: Math.round(availability * performance * quality * 1000) / 10,
    };
  }

  const machines = instances.map((i) => {
    const key = i.serialNumber;
    const downtimeHours = downtimeBySerial[key] ?? 0;
    const produced = producedBySerial[key] ?? 0;
    const defects = defectsBySerial[key] ?? 0;
    return {
      id: i.id,
      serialNumber: i.serialNumber,
      displayName: i.machine?.name ?? i.customName ?? "Unknown Machine",
      location: i.location,
      produced,
      defects,
      downtimeHours: Math.round(downtimeHours * 10) / 10,
      ...oeeFor(downtimeHours, produced, defects),
    };
  });

  // Fleet-wide OEE from summed totals (not an average of per-machine %s) —
  // more honest when only a few machines have logged production so far.
  const totalDowntime = instances.reduce((s, i) => s + (downtimeBySerial[i.serialNumber] ?? 0), 0);
  const totalProduced = instances.reduce((s, i) => s + (producedBySerial[i.serialNumber] ?? 0), 0);
  const totalDefects = instances.reduce((s, i) => s + (defectsBySerial[i.serialNumber] ?? 0), 0);
  const fleetPlannedHours = PLANNED_HOURS_PER_MACHINE_THIS_MONTH * instances.length;
  const fleetRuntimeHours = Math.max(0, fleetPlannedHours - totalDowntime);
  const fleetAvailability = fleetPlannedHours > 0 ? fleetRuntimeHours / fleetPlannedHours : 0;
  const fleetTheoreticalMax = fleetRuntimeHours * piecesPerHour;
  const fleetPerformance = fleetTheoreticalMax > 0 ? Math.min(1, totalProduced / fleetTheoreticalMax) : 0;
  const fleetQuality = totalProduced > 0 ? Math.max(0, (totalProduced - totalDefects) / totalProduced) : 0;

  res.json({
    fleet: {
      availability: Math.round(fleetAvailability * 1000) / 10,
      performance: Math.round(fleetPerformance * 1000) / 10,
      quality: Math.round(fleetQuality * 1000) / 10,
      oee: Math.round(fleetAvailability * fleetPerformance * fleetQuality * 1000) / 10,
      totalProduced,
      totalDefects,
      totalDowntimeHours: Math.round(totalDowntime * 10) / 10,
    },
    machines: machines.sort((a, b) => a.oee - b.oee),
  });
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

// ─── GET /analytics/maintenance-report.pdf ───────────────────────────────────
// "Nicely written" = a short plain-English narrative composed from the real
// numbers (template string, not an LLM call — free and instant like the
// rest of this report family), then the hidden-cost breakdown and a
// maintenance compliance table. Mirrors compliance.pdf's pdfkit conventions.

router.get("/maintenance-report.pdf", async (req, res) => {
  const { organizationId } = req.query as { organizationId?: string };
  if (!organizationId) return res.status(400).json({ error: "organizationId required" });

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return res.status(404).json({ error: "Organization not found" });

  const settings = resolveCostSettings(org);

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const orgUsers = await prisma.user.findMany({ where: { organizationId }, select: { id: true } });
  const userIds = orgUsers.map((u) => u.id);
  const tickets = await prisma.ticket.findMany({
    where: { createdByUserId: { in: userIds } },
    include: { events: true },
  });

  let thisMonthDowntimeHours = 0;
  for (const ticket of tickets) {
    if (ticket.status !== "COMPLETED") continue;
    const resolvedAt = resolutionTime(ticket.events);
    if (!resolvedAt || ticket.createdAt < firstOfMonth) continue;
    thisMonthDowntimeHours += (resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
  }

  const lostProductionValue = Math.round(thisMonthDowntimeHours * settings.piecesPerHour * settings.pricePerPiece);
  const idleLaborCost = Math.round(thisMonthDowntimeHours * settings.workersPerMachine * settings.hourlyWage);
  const totalHiddenCost = lostProductionValue + idleLaborCost;

  const tasks = await prisma.maintenanceTask.findMany({
    where: { organizationId },
    include: { machineInstance: { include: { machine: true } } },
    orderBy: [{ frequency: "asc" }, { name: "asc" }],
  });
  const taskRows = tasks.map((t) => ({ ...t, ...maintenanceStatus(t.lastCompletedAt, t.frequency) }));
  const overdueRows = taskRows.filter((t) => t.status === "overdue");
  const dueSoonRows = taskRows.filter((t) => t.status === "due_soon");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentLogs = await prisma.maintenanceLog.findMany({
    where: { maintenanceTask: { organizationId }, completedAt: { gte: thirtyDaysAgo } },
  });
  const onTimeCount = recentLogs.filter((l) => l.onTime).length;
  const onTimePct = recentLogs.length > 0 ? Math.round((onTimeCount / recentLogs.length) * 100) : null;

  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  const safeOrgName = org.name.replace(/[^a-zA-Z0-9]/g, "-");
  const dateStr = new Date().toISOString().split("T")[0];

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="fm-maintenance-report-${safeOrgName}-${dateStr}.pdf"`);
  doc.pipe(res);

  const BRAND = "#1d4ed8";

  doc.rect(0, 0, doc.page.width, 90).fill(BRAND);
  doc.fillColor("white").fontSize(22).font("Helvetica-Bold").text("FM Corporation", 50, 24);
  doc.fontSize(11).font("Helvetica").text("Hidden Cost & Maintenance Report", 50, 54);

  doc.fillColor("#111").fontSize(11).font("Helvetica");
  doc.text(`Factory: ${org.name}`, 50, 108);
  doc.text(`Location: ${org.location ?? "—"}`, 50, 124);
  doc.text(`Report date: ${new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}`, 50, 140);

  // ── Narrative summary ──
  doc.moveDown(3.2);
  doc.fontSize(13).font("Helvetica-Bold").fillColor(BRAND).text("Summary");
  doc.moveDown(0.4);

  // pdfkit's standard fonts only support WinAnsi/Latin-1 — the ৳ glyph isn't
  // in that set and silently corrupts the rest of the string it's in, so use
  // "Tk" here specifically (the web UI still shows ৳ everywhere else, where
  // the browser renders Unicode fine).
  const narrativeParts = [
    `This month, ${org.name} lost an estimated Tk ${lostProductionValue.toLocaleString()} in production value to ${Math.round(thisMonthDowntimeHours * 10) / 10} hours of machine downtime, plus an estimated Tk ${idleLaborCost.toLocaleString()} in idle labor costs — a total hidden cost of Tk ${totalHiddenCost.toLocaleString()}.`,
    onTimePct != null
      ? `Over the last 30 days, ${onTimeCount} of ${recentLogs.length} maintenance tasks (${onTimePct}%) were completed on time.`
      : `No maintenance tasks have been logged as completed in the last 30 days.`,
    overdueRows.length > 0
      ? `${overdueRows.length} maintenance task${overdueRows.length !== 1 ? "s are" : " is"} currently overdue — see the table below.`
      : `No maintenance tasks are currently overdue.`,
  ];
  doc.fontSize(10).font("Helvetica").fillColor("#111").text(narrativeParts.join(" "), { width: doc.page.width - 100, lineGap: 3 });

  // ── Hidden cost breakdown ──
  doc.moveDown(1.5);
  doc.fontSize(13).font("Helvetica-Bold").fillColor(BRAND).text("Hidden Cost of Downtime This Month");
  doc.moveDown(0.4);
  doc.fontSize(10).font("Helvetica").fillColor("#111");
  doc.text(`Lost production value:  Tk ${lostProductionValue.toLocaleString()}  (${Math.round(thisMonthDowntimeHours * 10) / 10} hrs x ${settings.piecesPerHour} pcs/hr x Tk ${settings.pricePerPiece}/pc)`, { indent: 16 });
  doc.text(`Idle labor cost:  Tk ${idleLaborCost.toLocaleString()}  (${Math.round(thisMonthDowntimeHours * 10) / 10} hrs x ${settings.workersPerMachine} worker(s) x Tk ${settings.hourlyWage}/hr)`, { indent: 16 });
  doc.font("Helvetica-Bold").text(`Total hidden cost:  Tk ${totalHiddenCost.toLocaleString()}`, { indent: 16 });

  // ── Maintenance compliance summary ──
  doc.moveDown(1.5);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(BRAND).text("Maintenance Compliance");
  doc.moveDown(0.4);
  doc.fontSize(10).font("Helvetica").fillColor("#111");
  const counts = {
    ok: taskRows.filter((t) => t.status === "ok").length,
    due_soon: dueSoonRows.length,
    overdue: overdueRows.length,
    never_done: taskRows.filter((t) => t.status === "never_done").length,
  };
  doc.text(`Up to date:  ${counts.ok}`, { indent: 16 });
  doc.text(`Due soon:  ${counts.due_soon}`, { indent: 16 });
  doc.text(`Overdue:  ${counts.overdue}`, { indent: 16 });
  doc.text(`Never completed:  ${counts.never_done}`, { indent: 16 });

  // ── Overdue / due-soon task table ──
  const flagged = [...overdueRows, ...dueSoonRows];
  if (flagged.length > 0) {
    doc.moveDown(1.5);
    doc.font("Helvetica-Bold").fontSize(13).fillColor(BRAND).text("Tasks Needing Attention");
    doc.moveDown(0.5);

    const COL = { machine: 50, task: 190, freq: 380, status: 450 };
    const ROW_H = 18;

    doc.rect(45, doc.y, doc.page.width - 90, ROW_H).fill("#e8eef8");
    const headerY = doc.y + 4;
    doc
      .fillColor(BRAND)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("Machine", COL.machine, headerY)
      .text("Task", COL.task, headerY)
      .text("Frequency", COL.freq, headerY)
      .text("Status", COL.status, headerY);
    doc.moveDown(0.1);

    let rowIdx = 0;
    for (const t of flagged) {
      if (rowIdx % 2 === 0) doc.rect(45, doc.y, doc.page.width - 90, ROW_H).fill("#f9fafb");
      rowIdx++;
      const rowY = doc.y + 4;
      const displayName = t.machineInstance.machine?.name ?? t.machineInstance.customName ?? "Unknown";
      const statusColor = t.status === "overdue" ? "#dc2626" : "#d97706";
      doc
        .fillColor("#111")
        .fontSize(8)
        .font("Helvetica")
        .text(`${displayName} (${t.machineInstance.serialNumber})`, COL.machine, rowY, { width: 135 })
        .text(t.name, COL.task, rowY, { width: 185 })
        .text(t.frequency, COL.freq, rowY, { width: 65 })
        .fillColor(statusColor)
        .font("Helvetica-Bold")
        .text(t.status === "overdue" ? "OVERDUE" : "DUE SOON", COL.status, rowY, { width: 90 });
      doc.moveDown(0.1);

      if (doc.y > doc.page.height - 80) {
        doc.addPage();
        doc.moveDown(0.5);
      }
    }
  }

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
