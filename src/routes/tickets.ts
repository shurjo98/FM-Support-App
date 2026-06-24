// src/routes/tickets.ts
import express, { Router } from "express";
import fs from "fs";
import path from "path";
import { prisma } from "../db";
import type { IssueType } from "../types";
import {
  buildCacheKey,
  getCachedAnswer,
  setCachedAnswer,
} from "../services/cacheService";
import { generateAiSuggestion, type SuggestionLang } from "../services/aiService"; // <-- RUNTIME import
import { notify } from "../services/notificationService";
import type { Prisma } from "@prisma/client";

const router = Router();

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ATTACHMENT_MIME_KIND: Record<string, "image" | "video"> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
};

const ticketInclude = { events: true, attachments: true };
type TicketWithRelations = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;

// Reshape the flattened Prisma row back into the original Ticket API shape
// (nested aiSuggestion object, ISO date strings) so the frontend is unaffected.
function serializeTicket(t: TicketWithRelations) {
  return {
    id: t.id,
    machineId: t.machineId,
    serialNumber: t.serialNumber,
    createdByUserId: t.createdByUserId,
    issueType: t.issueType,
    description: t.description,
    aiSuggestion:
      t.aiSuggestionText != null
        ? { text: t.aiSuggestionText, fromCache: t.aiSuggestionFromCache ?? false, creditsUsed: t.aiSuggestionCreditsUsed ?? 0 }
        : undefined,
    status: t.status,
    technicianId: t.technicianId,
    technicianNotes: t.technicianNotes,
    events: t.events
      .map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    attachments: t.attachments.map((a) => ({ ...a, uploadedAt: a.uploadedAt.toISOString() })),
    createdAt: t.createdAt.toISOString(),
  };
}

function mkEventData(type: string, description: string, authorName?: string) {
  return {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    description,
    authorName: authorName ?? null,
    createdAt: new Date(),
  };
}

// list tickets (for demo), optionally filtered by ?createdByUserId=
router.get("/", async (req, res) => {
  const { createdByUserId } = req.query as { createdByUserId?: string };
  const rows = await prisma.ticket.findMany({
    where: createdByUserId ? { createdByUserId } : {},
    include: ticketInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json(rows.map(serializeTicket));
});

// GET /tickets/:ticketId -> single ticket with full event timeline
router.get("/:ticketId", async (req, res) => {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.ticketId }, include: ticketInclude });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  return res.json(serializeTicket(ticket));
});

// create a ticket with AI suggestion + caching + credit usage
router.post("/", async (req, res) => {
  try {
    const { machineId, serialNumber, createdByUserId, issueType, description, lang } = req.body as {
      machineId: string;
      serialNumber?: string;
      createdByUserId: string;
      issueType: IssueType;
      description: string;
      lang?: SuggestionLang;
    };

    const machine = await prisma.machine.findUnique({ where: { id: machineId } });
    const user = await prisma.user.findUnique({ where: { id: createdByUserId } });

    if (!machine) {
      return res.status(400).json({ error: "Invalid machineId" });
    }
    if (!user) {
      return res.status(400).json({ error: "Invalid createdByUserId" });
    }
    if (user.role !== "IE") {
      return res.status(403).json({
        error: "Only your factory's Industrial Engineer (IE) can raise issues.",
      });
    }
    if (!serialNumber) {
      return res.status(400).json({ error: "Please select which machine (serial number) has the issue." });
    }
    const instance = await prisma.machineInstance.findFirst({
      where: { machineId, serialNumber },
    });
    if (!instance) {
      return res.status(400).json({ error: "Unknown serial number for this machine." });
    }
    if (instance.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "That machine isn't registered to your factory." });
    }

    const suggestionLang: SuggestionLang = lang === "bn" ? "bn" : "en";
    const cacheKey = buildCacheKey(issueType, description, suggestionLang);
    let suggestionText: string;
    let fromCache = false;
    let creditsUsed = 0;

    const cached = await getCachedAnswer(cacheKey);

    if (cached) {
      // cache hit → free
      suggestionText = cached.text;
      fromCache = true;
      creditsUsed = 0;
    } else {
      // cache miss → check credits
      if (user.aiCredits <= 0) {
        suggestionText =
          suggestionLang === "bn"
            ? "কোনো AI ক্রেডিট অবশিষ্ট নেই। সাধারণ ট্রাবলশুটিং ব্যবহার করুন বা টেকনিশিয়ানের সাথে যোগাযোগ করুন।"
            : "No AI credits remaining. Please use basic troubleshooting or contact technician.";
        fromCache = false;
        creditsUsed = 0;
      } else {
        // use 1 credit
        await prisma.user.update({ where: { id: user.id }, data: { aiCredits: { decrement: 1 } } });
        creditsUsed = 1;

        // REAL (or demo) AI suggestion
        suggestionText = await generateAiSuggestion(issueType, description, suggestionLang);
        await setCachedAnswer(cacheKey, issueType, suggestionText);
      }
    }

    const newTicket = await prisma.ticket.create({
      data: {
        id: `t-${Date.now()}`,
        machineId,
        serialNumber,
        createdByUserId,
        issueType,
        description,
        aiSuggestionText: suggestionText,
        aiSuggestionFromCache: fromCache,
        aiSuggestionCreditsUsed: creditsUsed,
        status: "OPEN",
        technicianId: null,
        technicianNotes: [],
        events: { create: [mkEventData("RAISED", `Issue raised by ${user.name} on ${serialNumber}`, user.name)] },
      },
      include: ticketInclude,
    });

    const remainingUser = await prisma.user.findUnique({ where: { id: user.id } });

    return res.status(201).json({
      ticket: serializeTicket(newTicket),
      remainingCredits: remainingUser?.aiCredits ?? 0,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:ticketId", async (req, res) => {
  const { ticketId } = req.params;
  const { status, technicianId, note, authorName } = req.body;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const eventsToCreate: ReturnType<typeof mkEventData>[] = [];
  const data: Prisma.TicketUpdateInput = {};

  if (status && status !== ticket.status) {
    data.status = status;
    eventsToCreate.push(mkEventData("STATUS_CHANGED", `Status changed to ${status}`, authorName));
  }

  if (technicianId && technicianId !== ticket.technicianId) {
    data.technicianId = technicianId;
    eventsToCreate.push(mkEventData("ASSIGNED", `Assigned to ${authorName ?? technicianId}`, authorName));
  }

  if (note) {
    data.technicianNotes = { push: note };
    eventsToCreate.push(mkEventData("COMMENT", note, authorName));
  }

  if (eventsToCreate.length) {
    data.events = { create: eventsToCreate };
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data,
    include: ticketInclude,
  });

  if (status && status !== ticket.status) {
    const requester = await prisma.user.findUnique({ where: { id: ticket.createdByUserId } });
    if (requester) {
      await notify({
        organizationId: requester.organizationId,
        phone: requester.phone ?? undefined,
        message: `Your ticket ${ticket.id} (${ticket.issueType.replaceAll("_", " ")}) is now ${status}.`,
      });
    }
  }

  return res.json({ ok: true, ticket: serializeTicket(updated) });
});

// POST /tickets/:ticketId/comments -> customer follow-up on their own ticket
router.post("/:ticketId/comments", async (req, res) => {
  const { ticketId } = req.params;
  const { userId, text } = req.body as { userId: string; text: string };

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(400).json({ error: "Invalid userId" });
  if (!text?.trim()) return res.status(400).json({ error: "text is required" });

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { events: { create: [mkEventData("COMMENT", text.trim(), user.name)] } },
    include: ticketInclude,
  });

  return res.status(201).json({ ok: true, ticket: serializeTicket(updated) });
});

// POST /tickets/:ticketId/attachments -> upload a photo/video of the defect.
// Raw file bytes in the body, Content-Type set to the file's mime type
// (same pattern as /ai/transcribe).
router.post(
  "/:ticketId/attachments",
  express.raw({ type: Object.keys(ATTACHMENT_MIME_KIND), limit: "20mb" }),
  async (req, res) => {
    const { ticketId } = req.params;
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const mimeType = (req.headers["content-type"]?.toString() || "").split(";")[0]?.trim() ?? "";
    const kind = ATTACHMENT_MIME_KIND[mimeType];
    if (!kind) return res.status(400).json({ error: "Unsupported file type" });

    const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");
    if (!buf.length) return res.status(400).json({ error: "Missing file bytes" });

    const ext = mimeType === "video/quicktime" ? "mov" : mimeType.split("/")[1];
    const filename = `${ticketId}-${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buf);

    const attachmentId = `att-${Date.now()}`;
    const url = `/uploads/${filename}`;

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        attachments: { create: [{ id: attachmentId, kind, url, uploadedAt: new Date() }] },
        events: { create: [mkEventData("ATTACHMENT", `${kind === "image" ? "Photo" : "Video"} attached`)] },
      },
      include: ticketInclude,
    });

    const attachment = updated.attachments.find((a) => a.id === attachmentId);

    return res.status(201).json({ ok: true, attachment, ticket: serializeTicket(updated) });
  }
);

// quick helper route (optional) to inspect users & credits
router.get("/debug/users", async (req, res) => {
  res.json(await prisma.user.findMany());
});

export default router;
