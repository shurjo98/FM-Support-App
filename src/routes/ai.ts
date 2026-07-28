// src/routes/ai.ts
import express from "express";
import { diagnoseText, routePortalQuery } from "../services/claude";

const router = express.Router();

router.post("/diagnose", async (req, res) => {
  try {
    const { question, machineModel, serialNumber } = req.body || {};
    if (!question?.trim()) {
      return res.status(400).json({ error: "Question is required." });
    }

    const diagnosis = await diagnoseText({ question, machineModel, serialNumber });

    return res.json({
      diagnosis,
      source: "claude",
      model: process.env.CLAUDE_DIAGNOSE_MODEL || "claude-haiku-4-5-20251001",
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "AI failed", detail: err?.message || String(err) });
  }
});

// POST /ai/portal-search -> the top search bar's AI agent: decides whether
// to navigate the customer somewhere in the portal or answer their question.
router.post("/portal-search", async (req, res) => {
  try {
    const { query, lang } = req.body || {};
    if (!query?.trim()) {
      return res.status(400).json({ error: "Query is required." });
    }

    const result = await routePortalQuery({ query, lang: lang === "bn" ? "bn" : "en" });
    return res.json(result);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "AI search failed", detail: err?.message || String(err) });
  }
});

export default router;
