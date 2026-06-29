// src/routes/dashboard.ts
import express, { Router } from "express";
import { prisma } from "../db";
import type { ReorderStatus, TaskColumn, TaskPriority } from "../types";
import { requireInternalAuth } from "../middleware/requireInternalAuth";
import { notify } from "../services/notificationService";
import { sendPushToAccount } from "../services/pushService";
import { storeFile } from "../services/fileStorage";
import type { Prisma } from "@prisma/client";

const router = Router();

const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Internal dashboard requires signing in with the shared FM/1111 credential
// (see src/services/authService.ts) before reaching the acting-as picker.
const REQUIRE_LOGIN = true;
if (REQUIRE_LOGIN) router.use(requireInternalAuth);

async function technicianName(technicianId?: string | null): Promise<string | null> {
  if (!technicianId) return null;
  const account = await prisma.internalAccount.findUnique({ where: { id: technicianId } });
  return account?.name ?? technicianId;
}

async function canManageTasks(accountId?: string): Promise<boolean> {
  if (!accountId) return false;
  const account = await prisma.internalAccount.findUnique({ where: { id: accountId } });
  return account?.role === "MANAGER" || account?.role === "ADMIN";
}

async function isAdmin(accountId?: string): Promise<boolean> {
  if (!accountId) return false;
  const account = await prisma.internalAccount.findUnique({ where: { id: accountId } });
  return account?.role === "ADMIN";
}

const VALID_ROLES = ["TECHNICIAN", "MANAGER", "ADMIN"];

function slugify(accountId: string): string {
  return accountId.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// GET /dashboard/accounts -> internal team roster (no passwords), used for
// the "acting as" switcher and the task assignee picker.
router.get("/accounts", async (req, res) => {
  const accounts = await prisma.internalAccount.findMany();
  res.json(
    accounts.map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      avatarUrl: a.avatarUrl,
      skills: a.skills,
      departments: a.departments,
    }))
  );
});

// POST /dashboard/accounts -> add a new team member (FM Admin only).
router.post("/accounts", async (req, res) => {
  const { name, accountId, password, role, skills, departments, actingAccountId } = req.body as {
    name: string;
    accountId: string;
    password: string;
    role: string;
    skills?: string[];
    departments?: string[];
    actingAccountId: string;
  };

  if (!(await isAdmin(actingAccountId))) {
    return res.status(403).json({ error: "Only an FM Admin can add team members." });
  }
  if (!name?.trim() || !accountId?.trim() || !password?.trim() || !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: "name, accountId, password, and a valid role are required" });
  }

  const existing = await prisma.internalAccount.findUnique({ where: { accountId: accountId.trim() } });
  if (existing) return res.status(409).json({ error: "That login ID is already taken." });

  const baseId = slugify(accountId) || `member-${Date.now()}`;
  let id = baseId;
  let suffix = 1;
  while (await prisma.internalAccount.findUnique({ where: { id } })) {
    id = `${baseId}-${++suffix}`;
  }

  const created = await prisma.internalAccount.create({
    data: {
      id,
      accountId: accountId.trim(),
      password: password.trim(),
      name: name.trim(),
      role,
      skills: (skills ?? []).map((s) => s.trim()).filter(Boolean),
      departments: (departments ?? []).map((d) => d.trim()).filter(Boolean),
    },
  });

  res.status(201).json({
    id: created.id,
    name: created.name,
    role: created.role,
    avatarUrl: created.avatarUrl,
    skills: created.skills,
    departments: created.departments,
  });
});

// PATCH /dashboard/accounts/:id -> edit a team member's name/login/role/password/skills/departments (FM Admin only).
router.patch("/accounts/:id", async (req, res) => {
  const { id } = req.params;
  const { name, accountId, password, role, skills, departments, actingAccountId } = req.body as {
    name?: string;
    accountId?: string;
    password?: string;
    role?: string;
    skills?: string[];
    departments?: string[];
    actingAccountId: string;
  };

  if (!(await isAdmin(actingAccountId))) {
    return res.status(403).json({ error: "Only an FM Admin can edit team members." });
  }

  const account = await prisma.internalAccount.findUnique({ where: { id } });
  if (!account) return res.status(404).json({ error: "Account not found" });

  if (role !== undefined && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  if (accountId !== undefined && accountId.trim() !== account.accountId) {
    const existing = await prisma.internalAccount.findUnique({ where: { accountId: accountId.trim() } });
    if (existing) return res.status(409).json({ error: "That login ID is already taken." });
  }

  const updated = await prisma.internalAccount.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(accountId !== undefined ? { accountId: accountId.trim() } : {}),
      ...(password !== undefined && password.trim() ? { password: password.trim() } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(skills !== undefined ? { skills: skills.map((s) => s.trim()).filter(Boolean) } : {}),
      ...(departments !== undefined ? { departments: departments.map((d) => d.trim()).filter(Boolean) } : {}),
    },
  });

  res.json({
    id: updated.id,
    name: updated.name,
    role: updated.role,
    avatarUrl: updated.avatarUrl,
    skills: updated.skills,
    departments: updated.departments,
  });
});

// DELETE /dashboard/accounts/:id -> remove a team member (FM Admin only).
router.delete("/accounts/:id", async (req, res) => {
  const { id } = req.params;
  const { actingAccountId } = req.query as { actingAccountId?: string };

  if (!(await isAdmin(actingAccountId))) {
    return res.status(403).json({ error: "Only an FM Admin can remove team members." });
  }
  if (id === actingAccountId) {
    return res.status(400).json({ error: "You can't remove your own account while acting as them." });
  }

  const account = await prisma.internalAccount.findUnique({ where: { id } });
  if (!account) return res.status(404).json({ error: "Account not found" });

  if (account.role === "ADMIN") {
    const adminCount = await prisma.internalAccount.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return res.status(400).json({ error: "Can't remove the last remaining FM Admin." });
    }
  }

  await prisma.internalAccount.delete({ where: { id } });
  res.json({ ok: true });
});

// POST /dashboard/accounts/:id/avatar -> upload a profile picture (raw image
// bytes, same pattern as ticket attachments / content card images).
router.post(
  "/accounts/:id/avatar",
  express.raw({ type: AVATAR_MIME_TYPES, limit: "10mb" }),
  async (req, res) => {
    const { id } = req.params;
    const account = await prisma.internalAccount.findUnique({ where: { id } });
    if (!account) return res.status(404).json({ error: "Account not found" });

    const mimeType = (req.headers["content-type"]?.toString() || "").split(";")[0]?.trim() ?? "";
    if (!AVATAR_MIME_TYPES.includes(mimeType)) return res.status(400).json({ error: "Unsupported image type" });

    const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");
    if (!buf.length) return res.status(400).json({ error: "Missing image bytes" });

    const avatarUrl = await storeFile(mimeType, buf);

    const updated = await prisma.internalAccount.update({
      where: { id },
      data: { avatarUrl },
    });

    res.status(201).json({
      id: updated.id,
      name: updated.name,
      role: updated.role,
      avatarUrl: updated.avatarUrl,
      skills: updated.skills,
      departments: updated.departments,
    });
  }
);

// GET /dashboard/goals -> team vision / targets, visible to everyone
router.get("/goals", async (req, res) => {
  const goals = await prisma.teamGoal.findMany({ orderBy: { createdAt: "asc" } });
  res.json(goals);
});

// POST /dashboard/goals -> create a team goal (manager/admin only)
router.post("/goals", async (req, res) => {
  const { title, description, targetValue, currentValue, unit, actingAccountId } = req.body as {
    title: string;
    description?: string;
    targetValue: number;
    currentValue?: number;
    unit: string;
    actingAccountId: string;
  };

  if (!(await canManageTasks(actingAccountId))) {
    return res.status(403).json({ error: "Only a manager or admin can set team goals." });
  }
  if (!title?.trim() || !unit?.trim() || !targetValue) {
    return res.status(400).json({ error: "title, unit, and targetValue are required" });
  }

  const goal = await prisma.teamGoal.create({
    data: {
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      description: description?.trim() || null,
      targetValue,
      currentValue: currentValue ?? 0,
      unit: unit.trim(),
    },
  });

  res.status(201).json(goal);
});

// PATCH /dashboard/goals/:id -> update progress/fields (manager/admin only)
router.patch("/goals/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, targetValue, currentValue, unit, actingAccountId } = req.body as {
    title?: string;
    description?: string | null;
    targetValue?: number;
    currentValue?: number;
    unit?: string;
    actingAccountId: string;
  };

  if (!(await canManageTasks(actingAccountId))) {
    return res.status(403).json({ error: "Only a manager or admin can update team goals." });
  }

  const goal = await prisma.teamGoal.findUnique({ where: { id } });
  if (!goal) return res.status(404).json({ error: "Goal not found" });

  const updated = await prisma.teamGoal.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(targetValue !== undefined ? { targetValue } : {}),
      ...(currentValue !== undefined ? { currentValue } : {}),
      ...(unit !== undefined ? { unit: unit.trim() } : {}),
    },
  });

  res.json(updated);
});

// DELETE /dashboard/goals/:id -> (manager/admin only)
router.delete("/goals/:id", async (req, res) => {
  const { id } = req.params;
  const { actingAccountId } = req.query as { actingAccountId?: string };

  if (!(await canManageTasks(actingAccountId))) {
    return res.status(403).json({ error: "Only a manager or admin can delete team goals." });
  }

  const goal = await prisma.teamGoal.findUnique({ where: { id } });
  if (!goal) return res.status(404).json({ error: "Goal not found" });

  await prisma.teamGoal.delete({ where: { id } });
  res.json({ ok: true });
});

// GET /dashboard -> tickets grouped by factory (organization) and worker (user)
router.get("/", async (req, res) => {
  const [organizations, users, tickets, machines] = await Promise.all([
    prisma.organization.findMany(),
    prisma.user.findMany(),
    prisma.ticket.findMany(),
    prisma.machine.findMany(),
  ]);

  const factories = await Promise.all(
    organizations.map(async (org) => {
      const orgUsers = users.filter((u) => u.organizationId === org.id);

      const workers = await Promise.all(
        orgUsers.map(async (user) => {
          const userTickets = await Promise.all(
            tickets
              .filter((t) => t.createdByUserId === user.id)
              .map(async (t) => ({
                id: t.id,
                issueType: t.issueType,
                description: t.description,
                status: t.status,
                machineName: machines.find((m) => m.id === t.machineId)?.name ?? t.customMachineName ?? "Unknown machine",
                serialNumber: t.serialNumber,
                assignedTo: await technicianName(t.technicianId),
                createdAt: t.createdAt,
              }))
          );

          return {
            id: user.id,
            name: user.name,
            ticketCount: userTickets.length,
            tickets: userTickets,
          };
        })
      );

      const orgTickets = workers.flatMap((w) => w.tickets);

      return {
        id: org.id,
        name: org.name,
        location: org.location,
        workerCount: workers.length,
        ticketCount: orgTickets.length,
        openCount: orgTickets.filter((t) => t.status === "OPEN").length,
        inProgressCount: orgTickets.filter((t) => t.status === "IN_PROGRESS").length,
        completedCount: orgTickets.filter((t) => t.status === "COMPLETED").length,
        workers,
      };
    })
  );

  res.json({
    totals: {
      factoryCount: factories.length,
      workerCount: users.length,
      ticketCount: tickets.length,
    },
    factories,
  });
});

// GET /dashboard/tickets -> flat list for table views, optionally filtered
// by ?factoryId=&workerId=&status=
router.get("/tickets", async (req, res) => {
  const { factoryId, workerId, status } = req.query as {
    factoryId?: string;
    workerId?: string;
    status?: string;
  };

  const [tickets, users, organizations, machines] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        ...(workerId ? { createdByUserId: workerId } : {}),
        ...(status ? { status } : {}),
      },
    }),
    prisma.user.findMany(),
    prisma.organization.findMany(),
    prisma.machine.findMany(),
  ]);

  const rows = await Promise.all(
    tickets
      .filter((t) => {
        if (!factoryId) return true;
        const user = users.find((u) => u.id === t.createdByUserId);
        return user?.organizationId === factoryId;
      })
      .map(async (t) => {
        const user = users.find((u) => u.id === t.createdByUserId);
        const org = organizations.find((o) => o.id === user?.organizationId);
        return {
          ticketId: t.id,
          factoryId: org?.id,
          factoryName: org?.name ?? "Unknown factory",
          workerId: user?.id,
          workerName: user?.name ?? "Unknown worker",
          machineName: machines.find((m) => m.id === t.machineId)?.name ?? t.customMachineName ?? "Unknown machine",
          serialNumber: t.serialNumber,
          issueType: t.issueType,
          description: t.description,
          status: t.status,
          assignedTo: await technicianName(t.technicianId),
          createdAt: t.createdAt,
        };
      })
  );

  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(rows);
});

// GET /dashboard/assignments -> tickets grouped by the technician they're
// assigned to, so the internal team can see who's working on what.
router.get("/assignments", async (req, res) => {
  const [accounts, tickets, users, organizations, machines] = await Promise.all([
    prisma.internalAccount.findMany(),
    prisma.ticket.findMany(),
    prisma.user.findMany(),
    prisma.organization.findMany(),
    prisma.machine.findMany(),
  ]);

  function ticketRow(t: (typeof tickets)[number]) {
    const user = users.find((u) => u.id === t.createdByUserId);
    const org = organizations.find((o) => o.id === user?.organizationId);
    return {
      ticketId: t.id,
      factoryName: org?.name ?? "Unknown factory",
      workerName: user?.name ?? "Unknown worker",
      machineName: machines.find((m) => m.id === t.machineId)?.name ?? t.customMachineName ?? "Unknown machine",
      serialNumber: t.serialNumber,
      issueType: t.issueType,
      description: t.description,
      status: t.status,
      createdAt: t.createdAt,
    };
  }

  const assignments = accounts.map((account) => {
    const assignedTickets = tickets.filter((t) => t.technicianId === account.id).map(ticketRow);

    return {
      technicianId: account.id,
      technicianName: account.name,
      ticketCount: assignedTickets.length,
      tickets: assignedTickets,
    };
  });

  const unassigned = tickets.filter((t) => !t.technicianId).map(ticketRow);

  res.json({
    assignments,
    unassigned: {
      ticketCount: unassigned.length,
      tickets: unassigned,
    },
  });
});

// GET /dashboard/reorders -> all factory reorder requests, for fulfillment
router.get("/reorders", async (req, res) => {
  const reorderRequests = await prisma.reorderRequest.findMany({
    include: { organization: true, requestedBy: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = reorderRequests.map((r) => ({
    id: r.id,
    factoryName: r.organization?.name ?? "Unknown factory",
    requestedByName: r.requestedBy?.name ?? "Unknown",
    itemType: r.itemType,
    itemName: r.itemName,
    quantity: r.quantity,
    status: r.status,
    createdAt: r.createdAt,
  }));

  res.json(rows);
});

// PATCH /dashboard/reorders/:id -> fulfillment status update
router.patch("/reorders/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: ReorderStatus };

  const request = await prisma.reorderRequest.findUnique({ where: { id } });
  if (!request) return res.status(404).json({ error: "Reorder request not found" });

  let updated = request;
  if (status && status !== request.status) {
    updated = await prisma.reorderRequest.update({ where: { id }, data: { status } });
    const requester = await prisma.user.findUnique({ where: { id: request.requestedByUserId } });
    await notify({
      organizationId: request.organizationId,
      phone: requester?.phone ?? undefined,
      message: `Your order for ${request.quantity}x ${request.itemName} is now ${status}.`,
    });
  }

  return res.json({ ok: true, request: updated });
});

// GET /dashboard/notifications -> simulated SMS/WhatsApp log for the team
router.get("/notifications", async (req, res) => {
  const [log, organizations] = await Promise.all([
    prisma.notificationLogEntry.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.organization.findMany(),
  ]);
  const rows = log.map((n) => ({
    ...n,
    factoryName: organizations.find((o) => o.id === n.organizationId)?.name ?? n.organizationId,
  }));
  res.json(rows);
});

const taskInclude = { events: true, comments: true, assignments: { include: { account: true } } };
type TaskWithRelations = Prisma.InternalTaskGetPayload<{ include: typeof taskInclude }>;

// Lead first (the "striker"), then assists, in the order they were added.
function sortAssignees<T extends { role: string }>(assignments: T[]): T[] {
  return [...assignments].sort((a, b) => (a.role === b.role ? 0 : a.role === "LEAD" ? -1 : 1));
}

async function enrichTask(t: TaskWithRelations) {
  const { assignments, ...rest } = t;
  const creator = await prisma.internalAccount.findUnique({ where: { id: t.createdByAccountId } });

  return {
    ...rest,
    assignees: sortAssignees(assignments).map((a) => ({
      accountId: a.accountId,
      name: a.account.name,
      avatarUrl: a.account.avatarUrl,
      role: a.role,
    })),
    createdByName: creator?.name ?? t.createdByAccountId,
    events: t.events
      .map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    comments: t.comments
      .map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

const COLUMN_LABELS: Record<TaskColumn, string> = {
  BACKLOG: "Backlog",
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

// One LEAD (the "striker") plus de-duplicated ASSIST helpers — a person
// can't be both on the same task, lead wins if they appear in both lists.
function buildAssignmentRows(leadId: string | null, assistIds: string[]): { id: string; accountId: string; role: "LEAD" | "ASSIST" }[] {
  const rows: { id: string; accountId: string; role: "LEAD" | "ASSIST" }[] = [];
  const seen = new Set<string>();
  if (leadId) {
    rows.push({ id: `ta-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, accountId: leadId, role: "LEAD" });
    seen.add(leadId);
  }
  for (const accountId of assistIds) {
    if (seen.has(accountId)) continue;
    seen.add(accountId);
    rows.push({ id: `ta-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${accountId}`, accountId, role: "ASSIST" });
  }
  return rows;
}

function describeAssignment(rows: { accountId: string; role: "LEAD" | "ASSIST" }[], namesById: Map<string, string>): string {
  if (rows.length === 0) return "Unassigned";
  const lead = rows.find((r) => r.role === "LEAD");
  const assists = rows.filter((r) => r.role === "ASSIST");
  const parts: string[] = [];
  if (lead) parts.push(`Lead: ${namesById.get(lead.accountId) ?? lead.accountId}`);
  if (assists.length) parts.push(`Assist: ${assists.map((a) => namesById.get(a.accountId) ?? a.accountId).join(", ")}`);
  return parts.join(" · ");
}

function mkTaskEventData(type: string, description: string, authorAccountId: string, authorName: string) {
  return {
    id: `tev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    description,
    authorAccountId,
    authorName,
    createdAt: new Date(),
  };
}

async function notifyManagersOfMove(task: { id: string; title: string; column: string }, mover: { id: string; name: string }) {
  await prisma.internalNotification.create({
    data: {
      id: `inot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      message: `${mover.name} moved "${task.title}" to ${COLUMN_LABELS[task.column as TaskColumn]}`,
      taskId: task.id,
      triggeredByAccountId: mover.id,
      triggeredByName: mover.name,
      recipientAccountId: null,
      read: false,
    },
  });
}

// Notifies one specific person (assigned a task, someone commented on their
// task, etc.) — both as an in-app bell entry and a Web Push notification to
// any devices they've enabled notifications on. Never notifies someone about
// their own action.
async function notifyAccount(
  recipientAccountId: string,
  message: string,
  taskId: string,
  triggeredBy: { id: string; name: string }
) {
  if (recipientAccountId === triggeredBy.id) return;

  await prisma.internalNotification.create({
    data: {
      id: `inot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      message,
      taskId,
      triggeredByAccountId: triggeredBy.id,
      triggeredByName: triggeredBy.name,
      recipientAccountId,
      read: false,
    },
  });

  await sendPushToAccount(recipientAccountId, { title: "FM Support", body: message });
}

// GET /dashboard/tasks -> the team Kanban board, everyone can view it
router.get("/tasks", async (req, res) => {
  const tasks = await prisma.internalTask.findMany({ include: taskInclude, orderBy: { createdAt: "asc" } });
  res.json(await Promise.all(tasks.map(enrichTask)));
});

// POST /dashboard/tasks -> create a task. Open to anyone on the team, so
// people can add their own tasks — editing another task's details (priority,
// assignee, etc.) is still manager/admin only, see PATCH below.
router.post("/tasks", async (req, res) => {
  const { title, description, priority, leadId, assistIds, column, dueDate, actingAccountId } = req.body as {
    title: string;
    description?: string;
    priority?: TaskPriority;
    leadId?: string | null;
    assistIds?: string[];
    column?: TaskColumn;
    dueDate?: string | null;
    actingAccountId: string;
  };

  if (!title?.trim()) {
    return res.status(400).json({ error: "title is required" });
  }

  const author = await prisma.internalAccount.findUnique({ where: { id: actingAccountId } });
  if (!author) return res.status(401).json({ error: "Unknown acting account." });

  const assignmentsToCreate = buildAssignmentRows(leadId ?? null, assistIds ?? []);

  const newTask = await prisma.internalTask.create({
    data: {
      id: `task-${Date.now()}`,
      title: title.trim(),
      description: description ?? null,
      column: column ?? "BACKLOG",
      priority: priority ?? "MEDIUM",
      dueDate: dueDate ?? null,
      createdByAccountId: actingAccountId,
      events: { create: [mkTaskEventData("CREATED", "Task created", author.id, author.name)] },
      ...(assignmentsToCreate.length ? { assignments: { create: assignmentsToCreate } } : {}),
    },
    include: taskInclude,
  });

  for (const a of assignmentsToCreate) {
    await notifyAccount(
      a.accountId,
      `${author.name} added you as ${a.role === "LEAD" ? "the lead" : "an assist"} on "${newTask.title}"`,
      newTask.id,
      author
    );
  }

  res.status(201).json(await enrichTask(newTask));
});

// PATCH /dashboard/tasks/:id -> move column (anyone on the team), or change
// priority/assignee/title/description/due date (manager/admin only). If a
// technician moves a task, the manager/admin get an in-app notification.
router.patch("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { column, priority, leadId, assistIds, title, description, dueDate, actingAccountId } = req.body as {
    column?: TaskColumn;
    priority?: TaskPriority;
    leadId?: string | null;
    assistIds?: string[];
    title?: string;
    description?: string;
    dueDate?: string | null;
    actingAccountId: string;
  };

  const account = await prisma.internalAccount.findUnique({ where: { id: actingAccountId } });
  if (!account) return res.status(401).json({ error: "Unknown acting account." });

  const task = await prisma.internalTask.findUnique({ where: { id }, include: { assignments: true } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const editingAssignees = leadId !== undefined || assistIds !== undefined;
  const editingDetails = priority !== undefined || editingAssignees || title !== undefined || description !== undefined || dueDate !== undefined;

  if (editingDetails && !(await canManageTasks(actingAccountId))) {
    return res.status(403).json({ error: "Only a manager or admin can edit task details." });
  }

  const eventsToCreate: ReturnType<typeof mkTaskEventData>[] = [];
  const data: Prisma.InternalTaskUpdateInput = {};
  let movedByTechnician = false;

  if (column && column !== task.column) {
    data.column = column;
    eventsToCreate.push(
      mkTaskEventData("MOVED", `Moved from ${COLUMN_LABELS[task.column as TaskColumn]} to ${COLUMN_LABELS[column]}`, account.id, account.name)
    );
    if (account.role === "TECHNICIAN") movedByTechnician = true;
  }

  if (priority && priority !== task.priority) {
    eventsToCreate.push(mkTaskEventData("PRIORITY_CHANGED", `Priority changed to ${priority}`, account.id, account.name));
    data.priority = priority;
  }

  let accountsToNotify: string[] = [];
  if (editingAssignees) {
    const currentLead = task.assignments.find((a) => a.role === "LEAD");
    const currentAssistIds = task.assignments.filter((a) => a.role === "ASSIST").map((a) => a.accountId);

    const resolvedLeadId = leadId !== undefined ? leadId : currentLead?.accountId ?? null;
    const resolvedAssistIds = assistIds !== undefined ? assistIds : currentAssistIds;
    const newRows = buildAssignmentRows(resolvedLeadId, resolvedAssistIds);

    const oldByAccount = new Map(task.assignments.map((a) => [a.accountId, a.role]));
    const newByAccount = new Map(newRows.map((r) => [r.accountId, r.role]));
    const changed =
      oldByAccount.size !== newByAccount.size ||
      [...newByAccount.entries()].some(([accountId, role]) => oldByAccount.get(accountId) !== role);

    if (changed) {
      // Notify anyone newly on the task, plus anyone promoted/demoted between
      // Lead and Assist — both are meaningful changes worth a ping.
      accountsToNotify = [...newByAccount.keys()].filter((accountId) => oldByAccount.get(accountId) !== newByAccount.get(accountId));

      await prisma.taskAssignment.deleteMany({ where: { taskId: id } });
      if (newRows.length) {
        await prisma.taskAssignment.createMany({ data: newRows.map((r) => ({ ...r, taskId: id })) });
      }

      const namesById = new Map(
        (await prisma.internalAccount.findMany({ where: { id: { in: newRows.map((r) => r.accountId) } } })).map((a) => [a.id, a.name])
      );
      eventsToCreate.push(mkTaskEventData("ASSIGNED", describeAssignment(newRows, namesById), account.id, account.name));
    }
  }

  if (dueDate !== undefined && dueDate !== task.dueDate) {
    eventsToCreate.push(
      mkTaskEventData("DUE_DATE_CHANGED", dueDate ? `Due date set to ${dueDate}` : "Due date cleared", account.id, account.name)
    );
    data.dueDate = dueDate;
  }

  if (title?.trim()) data.title = title.trim();
  if (description !== undefined) data.description = description;
  if (eventsToCreate.length) data.events = { create: eventsToCreate };

  const updated = await prisma.internalTask.update({
    where: { id },
    data,
    include: taskInclude,
  });

  if (movedByTechnician) {
    await notifyManagersOfMove(updated, account);
  }

  for (const newAccountId of accountsToNotify) {
    const role = updated.assignments.find((a) => a.accountId === newAccountId)?.role;
    await notifyAccount(
      newAccountId,
      `${account.name} added you as ${role === "LEAD" ? "the lead" : "an assist"} on "${updated.title}"`,
      updated.id,
      account
    );
  }

  res.json(await enrichTask(updated));
});

// POST /dashboard/tasks/:id/comments -> feedback thread, open to anyone on
// the team (this is how a technician gives feedback on a task).
router.post("/tasks/:id/comments", async (req, res) => {
  const { id } = req.params;
  const { text, actingAccountId } = req.body as { text: string; actingAccountId: string };

  const account = await prisma.internalAccount.findUnique({ where: { id: actingAccountId } });
  if (!account) return res.status(401).json({ error: "Unknown acting account." });
  if (!text?.trim()) return res.status(400).json({ error: "text is required" });

  const task = await prisma.internalTask.findUnique({ where: { id }, include: { assignments: true } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const updated = await prisma.internalTask.update({
    where: { id },
    data: {
      comments: {
        create: [
          {
            id: `tcm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            authorAccountId: account.id,
            authorName: account.name,
            text: text.trim(),
            createdAt: new Date(),
          },
        ],
      },
    },
    include: taskInclude,
  });

  const recipients = new Set([...task.assignments.map((a) => a.accountId), task.createdByAccountId].filter(Boolean));
  for (const recipientId of recipients) {
    await notifyAccount(recipientId, `${account.name} commented on "${task.title}": "${text.trim().slice(0, 80)}"`, task.id, account);
  }

  res.status(201).json(await enrichTask(updated));
});

// DELETE /dashboard/tasks/:id -> remove a task (manager/admin only)
router.delete("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { actingAccountId } = req.query as { actingAccountId?: string };

  if (!(await canManageTasks(actingAccountId))) {
    return res.status(403).json({ error: "Only a manager or admin can delete tasks." });
  }

  const task = await prisma.internalTask.findUnique({ where: { id } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  await prisma.internalTask.delete({ where: { id } });
  res.json({ ok: true });
});

// GET /dashboard/task-notifications?accountId=X -> alerts for one person:
// anything addressed to them directly (assigned, commented on), plus the
// manager/admin broadcast feed (e.g. "a technician moved a task") if they
// have that role.
router.get("/task-notifications", async (req, res) => {
  const { accountId } = req.query as { accountId?: string };
  if (!accountId) return res.json([]);

  const isManager = await canManageTasks(accountId);
  const rows = await prisma.internalNotification.findMany({
    where: {
      OR: [{ recipientAccountId: accountId }, ...(isManager ? [{ recipientAccountId: null }] : [])],
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(rows);
});

// PATCH /dashboard/task-notifications/read-all?accountId=X -> mark every
// notification visible to that person as read.
router.patch("/task-notifications/read-all", async (req, res) => {
  const { actingAccountId } = req.body as { actingAccountId?: string };
  if (!actingAccountId) return res.status(400).json({ error: "actingAccountId is required" });

  const isManager = await canManageTasks(actingAccountId);
  await prisma.internalNotification.updateMany({
    where: {
      OR: [{ recipientAccountId: actingAccountId }, ...(isManager ? [{ recipientAccountId: null }] : [])],
    },
    data: { read: true },
  });
  res.json({ ok: true });
});

export default router;
