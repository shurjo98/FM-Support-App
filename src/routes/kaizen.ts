// src/routes/kaizen.ts
import { Router } from "express";
import { prisma } from "../db";

const router = Router();

function mkId() {
  return `kzn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// GET /kaizen?organizationId=X
router.get("/", async (req, res) => {
  const { organizationId } = req.query as { organizationId?: string };
  if (!organizationId) return res.status(400).json({ error: "organizationId required" });

  const suggestions = await prisma.kaizenSuggestion.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });

  res.json(suggestions.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

// POST /kaizen — submit a new suggestion
router.post("/", async (req, res) => {
  const { organizationId, submittedBy, title, description } = req.body as {
    organizationId: string; submittedBy?: string; title: string; description: string;
  };
  if (!organizationId || !title?.trim() || !description?.trim()) {
    return res.status(400).json({ error: "organizationId, title and description are required" });
  }

  const entry = await prisma.kaizenSuggestion.create({
    data: {
      id: mkId(), organizationId,
      submittedBy: submittedBy ?? null,
      title: title.trim(), description: description.trim(),
    },
  });

  res.status(201).json({ ...entry, createdAt: entry.createdAt.toISOString() });
});

// PATCH /kaizen/:id — move a card between statuses. Anyone at the factory
// can do this — this app has no customer-side role system (User.role is
// always "IE" in practice), matching every other customer-portal write.
router.patch("/:id", async (req, res) => {
  const { status } = req.body as { status: string };
  if (!["NEW", "UNDER_REVIEW", "DONE"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const updated = await prisma.kaizenSuggestion.update({
    where: { id: req.params.id },
    data: { status },
  });

  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

export default router;
