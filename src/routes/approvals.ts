// src/routes/approvals.ts
//
// GM approval workflows: five request types (demo, leave, discount, qingke,
// warranty) that any internal staff member can submit and only a "GM"-role
// InternalAccount can approve/reject. Five separate Prisma models (see
// schema.prisma) since each type's fields genuinely differ, but this one
// route file drives all of them through small per-type lookup tables so the
// list/decide endpoints don't have to be five near-identical copies.
import express, { Router } from "express";
import { prisma } from "../db";
import { requireInternalAuth } from "../middleware/requireInternalAuth";
import { storeFile } from "../services/fileStorage";
import { sendPushToAccount } from "../services/pushService";

const router = Router();
router.use(requireInternalAuth);

function hasRole(roles: string[], role: string): boolean {
  return roles.some((r) => r.toUpperCase() === role.toUpperCase());
}

async function isGm(accountId?: string): Promise<boolean> {
  if (!accountId) return false;
  const account = await prisma.internalAccount.findUnique({ where: { id: accountId } });
  return account ? hasRole(account.roles, "GM") : false;
}

async function findGmAccounts() {
  const accounts = await prisma.internalAccount.findMany();
  return accounts.filter((a) => hasRole(a.roles, "GM"));
}

export type ApprovalType = "demo" | "leave" | "discount" | "qingke" | "warranty";
const APPROVAL_TYPES: ApprovalType[] = ["demo", "leave", "discount", "qingke", "warranty"];
function isApprovalType(t: string): t is ApprovalType {
  return (APPROVAL_TYPES as string[]).includes(t);
}

const APPROVAL_LABELS: Record<ApprovalType, string> = {
  demo: "Demo Approval",
  leave: "Leave Request",
  discount: "Discount Approval",
  qingke: "Hospitality (Qingke)",
  warranty: "Warranty & Repair (Baoxiu)",
};

const REQUIRED_FIELDS: Record<ApprovalType, string[]> = {
  demo: ["prospectCompany", "machineOrProduct"],
  leave: ["leaveType", "startDate", "endDate"],
  discount: ["organizationId", "itemOrQuoteDescription", "originalAmount"],
  qingke: ["amount"],
  warranty: ["organizationId", "issueDescription", "claimType"],
};

function missingFields(type: ApprovalType, fields: Record<string, unknown>): string[] {
  return REQUIRED_FIELDS[type].filter((f) => fields[f] === undefined || fields[f] === null || fields[f] === "");
}

async function createApproval(
  type: ApprovalType,
  id: string,
  common: { requestedByAccountId: string; requestedByName: string },
  f: Record<string, any>
) {
  switch (type) {
    case "demo":
      return prisma.demoApprovalRequest.create({
        data: {
          id,
          ...common,
          prospectCompany: f.prospectCompany,
          contactPerson: f.contactPerson || null,
          contactPhone: f.contactPhone || null,
          machineOrProduct: f.machineOrProduct,
          proposedDate: f.proposedDate || null,
          location: f.location || null,
          purpose: f.purpose || null,
        },
      });
    case "leave":
      return prisma.leaveRequest.create({
        data: {
          id,
          ...common,
          leaveType: f.leaveType,
          startDate: f.startDate,
          endDate: f.endDate,
          reason: f.reason || null,
        },
      });
    case "discount":
      return prisma.discountApprovalRequest.create({
        data: {
          id,
          ...common,
          organizationId: f.organizationId,
          itemOrQuoteDescription: f.itemOrQuoteDescription,
          originalAmount: Number(f.originalAmount),
          discountPercent: f.discountPercent != null && f.discountPercent !== "" ? Number(f.discountPercent) : null,
          discountAmount: f.discountAmount != null && f.discountAmount !== "" ? Number(f.discountAmount) : null,
          reason: f.reason || null,
        },
        include: { organization: true },
      });
    case "qingke":
      return prisma.hospitalityApprovalRequest.create({
        data: {
          id,
          ...common,
          organizationId: f.organizationId || null,
          venue: f.venue || null,
          eventDate: f.eventDate || null,
          amount: Number(f.amount),
          attendees: f.attendees || null,
          purpose: f.purpose || null,
        },
        include: { organization: true },
      });
    case "warranty":
      return prisma.warrantyClaim.create({
        data: {
          id,
          ...common,
          organizationId: f.organizationId,
          machineId: f.machineId || null,
          serialNumber: f.serialNumber || null,
          customMachineName: f.customMachineName || null,
          issueDescription: f.issueDescription,
          claimType: f.claimType,
        },
        include: { organization: true, machine: true, attachments: true },
      });
  }
}

async function findOne(type: ApprovalType, id: string) {
  switch (type) {
    case "demo":
      return prisma.demoApprovalRequest.findUnique({ where: { id } });
    case "leave":
      return prisma.leaveRequest.findUnique({ where: { id } });
    case "discount":
      return prisma.discountApprovalRequest.findUnique({ where: { id } });
    case "qingke":
      return prisma.hospitalityApprovalRequest.findUnique({ where: { id } });
    case "warranty":
      return prisma.warrantyClaim.findUnique({ where: { id } });
  }
}

async function updateStatus(
  type: ApprovalType,
  id: string,
  data: { status: string; decisionNote: string | null; decidedByAccountId: string; decidedByName: string; decidedAt: Date }
) {
  switch (type) {
    case "demo":
      return prisma.demoApprovalRequest.update({ where: { id }, data });
    case "leave":
      return prisma.leaveRequest.update({ where: { id }, data });
    case "discount":
      return prisma.discountApprovalRequest.update({ where: { id }, data, include: { organization: true } });
    case "qingke":
      return prisma.hospitalityApprovalRequest.update({ where: { id }, data, include: { organization: true } });
    case "warranty":
      return prisma.warrantyClaim.update({ where: { id }, data, include: { organization: true, machine: true, attachments: true } });
  }
}

// Reshapes any of the 5 rows into one consistent list-item shape the
// frontend can render generically, with a `detail` bag for the type-specific
// fields (mirrors serializeTicket()'s reshape-for-the-frontend approach).
function serialize(type: ApprovalType, row: any) {
  const base = {
    id: row.id,
    type,
    label: APPROVAL_LABELS[type],
    status: row.status as "PENDING" | "APPROVED" | "REJECTED",
    requestedByAccountId: row.requestedByAccountId,
    requestedByName: row.requestedByName,
    decisionNote: row.decisionNote ?? null,
    decidedByName: row.decidedByName ?? null,
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };

  switch (type) {
    case "demo":
      return {
        ...base,
        summary: `${row.prospectCompany} — ${row.machineOrProduct}`,
        detail: {
          prospectCompany: row.prospectCompany,
          contactPerson: row.contactPerson,
          contactPhone: row.contactPhone,
          machineOrProduct: row.machineOrProduct,
          proposedDate: row.proposedDate,
          location: row.location,
          purpose: row.purpose,
        },
      };
    case "leave":
      return {
        ...base,
        summary: `${row.leaveType} leave, ${row.startDate} → ${row.endDate}`,
        detail: { leaveType: row.leaveType, startDate: row.startDate, endDate: row.endDate, reason: row.reason },
      };
    case "discount":
      return {
        ...base,
        summary: `${row.organization?.name ?? "Factory"} — ${row.itemOrQuoteDescription}`,
        detail: {
          organizationId: row.organizationId,
          organizationName: row.organization?.name ?? null,
          itemOrQuoteDescription: row.itemOrQuoteDescription,
          originalAmount: row.originalAmount,
          discountPercent: row.discountPercent,
          discountAmount: row.discountAmount,
          reason: row.reason,
        },
      };
    case "qingke":
      return {
        ...base,
        summary: `${row.organization?.name ?? row.venue ?? "Client"} — ৳${row.amount}`,
        detail: {
          organizationId: row.organizationId,
          organizationName: row.organization?.name ?? null,
          venue: row.venue,
          eventDate: row.eventDate,
          amount: row.amount,
          attendees: row.attendees,
          purpose: row.purpose,
        },
      };
    case "warranty":
      return {
        ...base,
        summary: `${row.organization?.name ?? "Factory"} — ${row.customMachineName ?? row.machine?.name ?? row.serialNumber ?? "Machine"}`,
        detail: {
          organizationId: row.organizationId,
          organizationName: row.organization?.name ?? null,
          machineId: row.machineId,
          serialNumber: row.serialNumber,
          customMachineName: row.customMachineName ?? row.machine?.name ?? null,
          issueDescription: row.issueDescription,
          claimType: row.claimType,
          attachments: (row.attachments ?? []).map((a: any) => ({
            id: a.id,
            url: a.url,
            mimeType: a.mimeType,
            uploadedAt: a.uploadedAt.toISOString(),
          })),
        },
      };
  }
}

async function fetchMine(accountId: string) {
  const [demo, leave, discount, qingke, warranty] = await Promise.all([
    prisma.demoApprovalRequest.findMany({ where: { requestedByAccountId: accountId } }),
    prisma.leaveRequest.findMany({ where: { requestedByAccountId: accountId } }),
    prisma.discountApprovalRequest.findMany({ where: { requestedByAccountId: accountId }, include: { organization: true } }),
    prisma.hospitalityApprovalRequest.findMany({ where: { requestedByAccountId: accountId }, include: { organization: true } }),
    prisma.warrantyClaim.findMany({
      where: { requestedByAccountId: accountId },
      include: { organization: true, machine: true, attachments: true },
    }),
  ]);
  return [
    ...demo.map((r) => serialize("demo", r)),
    ...leave.map((r) => serialize("leave", r)),
    ...discount.map((r) => serialize("discount", r)),
    ...qingke.map((r) => serialize("qingke", r)),
    ...warranty.map((r) => serialize("warranty", r)),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function fetchInbox() {
  const [demo, leave, discount, qingke, warranty] = await Promise.all([
    prisma.demoApprovalRequest.findMany({ where: { status: "PENDING" } }),
    prisma.leaveRequest.findMany({ where: { status: "PENDING" } }),
    prisma.discountApprovalRequest.findMany({ where: { status: "PENDING" }, include: { organization: true } }),
    prisma.hospitalityApprovalRequest.findMany({ where: { status: "PENDING" }, include: { organization: true } }),
    prisma.warrantyClaim.findMany({
      where: { status: "PENDING" },
      include: { organization: true, machine: true, attachments: true },
    }),
  ]);
  // Oldest pending first, so a GM working the queue clears the backlog in order.
  return [
    ...demo.map((r) => serialize("demo", r)),
    ...leave.map((r) => serialize("leave", r)),
    ...discount.map((r) => serialize("discount", r)),
    ...qingke.map((r) => serialize("qingke", r)),
    ...warranty.map((r) => serialize("warranty", r)),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

// GET /approvals/mine?accountId= -> everything the acting account has submitted, any status.
router.get("/mine", async (req, res) => {
  const { accountId } = req.query as { accountId?: string };
  if (!accountId) return res.status(400).json({ error: "accountId is required" });
  return res.json(await fetchMine(accountId));
});

// GET /approvals/inbox?accountId= -> GM-only merged pending queue.
router.get("/inbox", async (req, res) => {
  const { accountId } = req.query as { accountId?: string };
  if (!(await isGm(accountId))) return res.status(403).json({ error: "GM role required" });
  return res.json(await fetchInbox());
});

// POST /approvals/:type -> submit a new request (any authenticated staff member).
router.post("/:type", async (req, res) => {
  const { type } = req.params;
  if (!isApprovalType(type)) return res.status(404).json({ error: "Unknown approval type" });

  const { actingAccountId, ...fields } = req.body as Record<string, any>;
  if (!actingAccountId) return res.status(400).json({ error: "actingAccountId is required" });

  const requester = await prisma.internalAccount.findUnique({ where: { id: actingAccountId } });
  if (!requester) return res.status(400).json({ error: "Invalid actingAccountId" });

  const missing = missingFields(type, fields);
  if (missing.length) return res.status(400).json({ error: `Missing required field(s): ${missing.join(", ")}` });

  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const created = await createApproval(type, id, { requestedByAccountId: requester.id, requestedByName: requester.name }, fields);

  const gms = await findGmAccounts();
  await Promise.all(
    gms.map((gm) =>
      sendPushToAccount(gm.id, {
        title: "New approval request",
        body: `${requester.name} submitted a ${APPROVAL_LABELS[type]} request.`,
      })
    )
  );

  return res.status(201).json(serialize(type, created));
});

// POST /approvals/warranty/:id/attachments -> raw file bytes, same pattern as
// POST /tickets/:ticketId/attachments (see tickets.ts).
const ATTACHMENT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
router.post(
  "/warranty/:id/attachments",
  express.raw({ type: ATTACHMENT_MIME_TYPES, limit: "20mb" }),
  async (req, res) => {
    const { id } = req.params;
    const claim = await prisma.warrantyClaim.findUnique({ where: { id } });
    if (!claim) return res.status(404).json({ error: "Warranty claim not found" });

    const mimeType = (req.headers["content-type"]?.toString() || "").split(";")[0]?.trim() ?? "";
    if (!ATTACHMENT_MIME_TYPES.includes(mimeType)) return res.status(400).json({ error: "Unsupported file type" });

    const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");
    if (!buf.length) return res.status(400).json({ error: "Missing file bytes" });

    const url = await storeFile(mimeType, buf);
    const updated = await prisma.warrantyClaim.update({
      where: { id },
      data: {
        attachments: {
          create: [{ id: `wca-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, url, mimeType, uploadedAt: new Date() }],
        },
      },
      include: { organization: true, machine: true, attachments: true },
    });

    return res.status(201).json(serialize("warranty", updated));
  }
);

// PATCH /approvals/:type/:id -> GM approves/rejects.
router.patch("/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  if (!isApprovalType(type)) return res.status(404).json({ error: "Unknown approval type" });

  const { decision, note, actingAccountId } = req.body as { decision?: string; note?: string; actingAccountId?: string };
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return res.status(400).json({ error: "decision must be APPROVED or REJECTED" });
  }
  if (!(await isGm(actingAccountId))) {
    return res.status(403).json({ error: "Only a GM can decide approval requests." });
  }

  const existing = await findOne(type, id);
  if (!existing) return res.status(404).json({ error: "Request not found" });

  const decider = await prisma.internalAccount.findUnique({ where: { id: actingAccountId! } });

  const updated = await updateStatus(type, id, {
    status: decision,
    decisionNote: note?.trim() || null,
    decidedByAccountId: actingAccountId!,
    decidedByName: decider?.name ?? actingAccountId!,
    decidedAt: new Date(),
  });

  await sendPushToAccount((existing as any).requestedByAccountId, {
    title: `${APPROVAL_LABELS[type]} ${decision === "APPROVED" ? "approved" : "rejected"}`,
    body: note?.trim() || `Your ${APPROVAL_LABELS[type]} request was ${decision.toLowerCase()}.`,
  });

  return res.json(serialize(type, updated));
});

export default router;
