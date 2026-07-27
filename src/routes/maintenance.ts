// src/routes/maintenance.ts
//
// Recurring daily/weekly/monthly machine maintenance (motor, oil, belt,
// electrical, etc.) — distinct from MachineInstance.lastServicedAt/
// serviceIntervalMonths, which is a single one-shot "service visit" date for
// the whole machine, not independent per-task schedules. Auto-seeded per
// machine instance from a static default catalog, same pattern as
// audit.ts's CHECKLIST/seedIfNeeded. Factories can add their own tasks too.
import { Router } from "express";
import { prisma } from "../db";

const router = Router();

export type MaintenanceFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

const DEFAULT_TASKS: { name: string; category: string; frequency: MaintenanceFrequency }[] = [
  // Daily
  { name: "Clean lint & dust from feed dog and bobbin area", category: "Cleaning", frequency: "DAILY" },
  { name: "Check oil reservoir level", category: "Lubrication", frequency: "DAILY" },
  { name: "Wipe machine head & inspect needle for burrs/bend", category: "Inspection", frequency: "DAILY" },
  // Weekly
  { name: "Check & adjust belt tension", category: "Inspection", frequency: "WEEKLY" },
  { name: "Lubricate hook race & needle-bar linkage points", category: "Lubrication", frequency: "WEEKLY" },
  { name: "Inspect thread tension discs", category: "Inspection", frequency: "WEEKLY" },
  { name: "Check presser foot pressure & alignment", category: "Inspection", frequency: "WEEKLY" },
  // Monthly
  { name: "Full oil change / reservoir flush", category: "Lubrication", frequency: "MONTHLY" },
  { name: "Motor bearing lubrication & inspection", category: "Lubrication", frequency: "MONTHLY" },
  { name: "Tighten electrical control-box connections", category: "Electrical", frequency: "MONTHLY" },
  { name: "Verify hook timing", category: "Inspection", frequency: "MONTHLY" },
  { name: "Deep-clean rotary hook / looper assembly", category: "Cleaning", frequency: "MONTHLY" },
];

// Template/welting machines run on pneumatics — extra monthly task.
const PNEUMATIC_TASK = { name: "Check pneumatic pressure & drain air-filter moisture", category: "Pneumatic", frequency: "MONTHLY" as const };
const PNEUMATIC_CATEGORIES = new Set(["template", "welting"]);

function catalogFor(machineCategory: string | null): { name: string; category: string; frequency: MaintenanceFrequency }[] {
  const base = DEFAULT_TASKS;
  return machineCategory && PNEUMATIC_CATEGORIES.has(machineCategory) ? [...base, PNEUMATIC_TASK] : base;
}

// Window length per frequency, and how close to due counts as "due soon" —
// generalizes analytics.ts's serviceStatus() bucket logic (ok/due_soon/
// overdue) to arbitrary windows instead of just months.
const WINDOW_DAYS: Record<MaintenanceFrequency, number> = { DAILY: 1, WEEKLY: 7, MONTHLY: 30 };

export type MaintenanceStatus = "ok" | "due_soon" | "overdue" | "never_done";

export function maintenanceStatus(
  lastCompletedAt: Date | null,
  frequency: string
): { status: MaintenanceStatus; nextDue: string | null } {
  const windowDays = WINDOW_DAYS[frequency as MaintenanceFrequency] ?? 30;
  if (!lastCompletedAt) return { status: "never_done", nextDue: null };

  const due = new Date(lastCompletedAt.getTime() + windowDays * 24 * 60 * 60 * 1000);
  const daysUntilDue = (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  // For a 1-day window, a floor of "at least 1 day" would make every DAILY
  // task show due_soon the instant it's completed (nextDue is always ~1 day
  // out) — never "ok". Use a few-hour threshold for short windows instead.
  const soonThreshold = windowDays <= 1 ? 4 / 24 : Math.max(1, windowDays * 0.2);
  const status: MaintenanceStatus = daysUntilDue < 0 ? "overdue" : daysUntilDue <= soonThreshold ? "due_soon" : "ok";
  return { status, nextDue: due.toISOString() };
}

async function seedIfNeeded(organizationId: string) {
  const instances = await prisma.machineInstance.findMany({
    where: { organizationId },
    include: { machine: true },
  });
  const existingTasks = await prisma.maintenanceTask.findMany({
    where: { organizationId },
    select: { machineInstanceId: true },
  });
  const seededInstanceIds = new Set(existingTasks.map((t) => t.machineInstanceId));

  const toCreate: { id: string; organizationId: string; machineInstanceId: string; name: string; category: string; frequency: string }[] = [];
  for (const inst of instances) {
    if (seededInstanceIds.has(inst.id)) continue;
    const category = inst.machine?.category ?? inst.category ?? null;
    for (const tmpl of catalogFor(category)) {
      toCreate.push({
        id: `mtask-${inst.id}-${tmpl.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`,
        organizationId,
        machineInstanceId: inst.id,
        name: tmpl.name,
        category: tmpl.category,
        frequency: tmpl.frequency,
      });
    }
  }

  if (toCreate.length > 0) {
    await prisma.maintenanceTask.createMany({ data: toCreate, skipDuplicates: true });
  }
}

// GET /maintenance?organizationId= -> tasks (with computed status) grouped
// by frequency, plus recent completion history.
router.get("/", async (req, res) => {
  const { organizationId } = req.query as { organizationId?: string };
  if (!organizationId) return res.status(400).json({ error: "organizationId required" });

  await seedIfNeeded(organizationId);

  const tasks = await prisma.maintenanceTask.findMany({
    where: { organizationId },
    include: { machineInstance: { include: { machine: true } } },
    orderBy: [{ frequency: "asc" }, { name: "asc" }],
  });

  const rows = tasks.map((t) => {
    const { status, nextDue } = maintenanceStatus(t.lastCompletedAt, t.frequency);
    return {
      id: t.id,
      machineInstanceId: t.machineInstanceId,
      machineLabel: t.machineInstance.machine?.name ?? t.machineInstance.customName ?? "Unknown machine",
      serialNumber: t.machineInstance.serialNumber,
      name: t.name,
      category: t.category,
      frequency: t.frequency,
      lastCompletedAt: t.lastCompletedAt?.toISOString() ?? null,
      lastCompletedBy: t.lastCompletedBy,
      notes: t.notes,
      status,
      nextDue,
    };
  });

  const recentLogs = await prisma.maintenanceLog.findMany({
    where: { maintenanceTask: { organizationId } },
    include: { maintenanceTask: { select: { name: true, machineInstance: { select: { serialNumber: true } } } } },
    orderBy: { completedAt: "desc" },
    take: 15,
  });

  res.json({
    tasks: rows,
    counts: {
      overdue: rows.filter((r) => r.status === "overdue").length,
      due_soon: rows.filter((r) => r.status === "due_soon").length,
      ok: rows.filter((r) => r.status === "ok").length,
      never_done: rows.filter((r) => r.status === "never_done").length,
    },
    recentLogs: recentLogs.map((l) => ({
      id: l.id,
      taskName: l.maintenanceTask.name,
      serialNumber: l.maintenanceTask.machineInstance.serialNumber,
      completedAt: l.completedAt.toISOString(),
      completedBy: l.completedBy,
      onTime: l.onTime,
    })),
  });
});

// POST /maintenance/:taskId/complete -> mark done today, log the completion.
router.post("/:taskId/complete", async (req, res) => {
  const { taskId } = req.params;
  const { completedBy, notes } = req.body as { completedBy?: string; notes?: string };

  // Poka-yoke: a task can't be marked done with nothing to show for it — a
  // one-tap "done" with no record of what was actually checked/replaced is
  // exactly the kind of silent-skip a real andon/TPM system tries to prevent.
  if (!notes?.trim()) {
    return res.status(400).json({ error: "A short note on what you checked or replaced is required to mark this done." });
  }

  const task = await prisma.maintenanceTask.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const now = new Date();
  const { status: statusBeforeCompletion } = maintenanceStatus(task.lastCompletedAt, task.frequency);
  const onTime = statusBeforeCompletion !== "overdue";

  await prisma.maintenanceLog.create({
    data: {
      id: `mlog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      maintenanceTaskId: task.id,
      completedAt: now,
      completedBy: completedBy || null,
      notes: notes || null,
      onTime,
    },
  });

  const updated = await prisma.maintenanceTask.update({
    where: { id: task.id },
    data: { lastCompletedAt: now, lastCompletedBy: completedBy || null },
  });

  const { status, nextDue } = maintenanceStatus(updated.lastCompletedAt, updated.frequency);
  res.json({ ...updated, status, nextDue });
});

// POST /maintenance -> add a custom task (factories that do things differently).
router.post("/", async (req, res) => {
  const { organizationId, machineInstanceId, name, category, frequency } = req.body as {
    organizationId?: string;
    machineInstanceId?: string;
    name?: string;
    category?: string;
    frequency?: MaintenanceFrequency;
  };
  if (!organizationId || !machineInstanceId || !name?.trim() || !frequency) {
    return res.status(400).json({ error: "organizationId, machineInstanceId, name, and frequency are required" });
  }
  if (!WINDOW_DAYS[frequency]) return res.status(400).json({ error: "frequency must be DAILY, WEEKLY, or MONTHLY" });

  const created = await prisma.maintenanceTask.create({
    data: {
      id: `mtask-custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      organizationId,
      machineInstanceId,
      name: name.trim(),
      category: category?.trim() || "Custom",
      frequency,
    },
  });

  res.status(201).json(created);
});

// DELETE /maintenance/:taskId
router.delete("/:taskId", async (req, res) => {
  await prisma.maintenanceTask.delete({ where: { id: req.params.taskId } }).catch(() => {});
  res.json({ ok: true });
});

export default router;
