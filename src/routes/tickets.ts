// src/routes/tickets.ts
import { Router } from "express";
import { tickets, machines, users } from "../store";
import type { Ticket, IssueType, AiSuggestion } from "../types";
import {
  buildCacheKey,
  getCachedAnswer,
  setCachedAnswer,
} from "../services/cacheService";
import { generateAiSuggestion } from "../services/aiService"; // <-- RUNTIME import

const router = Router();



// list tickets (for demo), optionally filtered by ?createdByUserId=
router.get("/", (req, res) => {
  const { createdByUserId } = req.query as { createdByUserId?: string };
  const rows = createdByUserId
    ? tickets.filter((t) => t.createdByUserId === createdByUserId)
    : tickets;
  res.json(rows);
});

// create a ticket with AI suggestion + caching + credit usage
router.post("/", async (req, res) => {
  try {
    const { machineId, createdByUserId, issueType, description } = req.body as {
      machineId: string;
      createdByUserId: string;
      issueType: IssueType;
      description: string;
    };

    const machine = machines.find((m) => m.id === machineId);
    const user = users.find((u) => u.id === createdByUserId);

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

    const cacheKey = buildCacheKey(issueType, description);
    let suggestionText: string;
    let fromCache = false;
    let creditsUsed = 0;

    const cached = getCachedAnswer(cacheKey);

    if (cached) {
      // cache hit → free
      suggestionText = cached.text;
      fromCache = true;
      creditsUsed = 0;
    } else {
      // cache miss → check credits
      if (user.aiCredits <= 0) {
        suggestionText =
          "No AI credits remaining. Please use basic troubleshooting or contact technician.";
        fromCache = false;
        creditsUsed = 0;
      } else {
        // use 1 credit
        user.aiCredits -= 1;
        creditsUsed = 1;

        // REAL (or demo) AI suggestion
        suggestionText = await generateAiSuggestion(issueType, description);
        setCachedAnswer(cacheKey, issueType, suggestionText);
      }
    }

    const aiSuggestion: AiSuggestion = {
      text: suggestionText,
      fromCache,
      creditsUsed,
    };

    const newTicket: Ticket = {
      id: `t-${Date.now()}`,
      machineId,
      createdByUserId,
      issueType,
      description,
      aiSuggestion,
      status: "OPEN",
      technicianId: null,
      technicianNotes: [],
      createdAt: new Date().toISOString(),
    };


    tickets.push(newTicket);

    return res.status(201).json({
      ticket: newTicket,
      remainingCredits: user.aiCredits,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:ticketId", (req, res) => {
  const { ticketId } = req.params;
  const { status, technicianId, note } = req.body;

  const ticket = tickets.find((t) => t.id === ticketId);

  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  if (status) ticket.status = status;
  if (technicianId) ticket.technicianId = technicianId;

  if (note) {
    ticket.technicianNotes.push(note);
  }

  return res.json({ ok: true, ticket });
});


// quick helper route (optional) to inspect users & credits
router.get("/debug/users", (req, res) => {
  res.json(users);
});

export default router;
