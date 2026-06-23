// src/routes/ai.ts
import express from "express";
import { diagnoseText, textToSpeechBangla, transcribeBanglaAudio } from "../services/openai";

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
      source: "openai",
      model: process.env.OPENAI_DIAGNOSE_MODEL || "gpt-4o-mini",
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "AI failed", detail: err?.message || String(err) });
  }
});

router.post("/speak", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text?.trim()) return res.status(400).json({ error: "Missing text" });

    const audio = await textToSpeechBangla(text);

    res.setHeader("Content-Type", "audio/mpeg");
    return res.send(audio);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Voice generation failed", detail: err?.message || String(err) });
  }
});

/**
 * ✅ iPhone voice input: POST raw audio bytes -> { text }
 * Frontend calls: POST /api/ai/transcribe (via Vite proxy)
 */
router.post(
  "/transcribe",
  express.raw({
    type: [
      "audio/webm",
      "audio/wav",
      "audio/mpeg",
      "audio/mp3",
      "audio/mp4",
      "application/octet-stream",
    ],
    limit: "25mb",
  }),
  async (req, res) => {
    try {
      const mimeType = (req.headers["content-type"]?.toString() || "application/octet-stream").trim();
      const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");

      if (!buf.length) return res.status(400).json({ error: "Missing audio bytes" });

      const text = await transcribeBanglaAudio(buf, mimeType);
      return res.json({ text });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Transcribe failed", detail: err?.message || String(err) });
    }
  }
);

export default router;
