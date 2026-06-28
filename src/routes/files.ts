// src/routes/files.ts
import { Router } from "express";
import { prisma } from "../db";

const router = Router();

// GET /files/:id -> serves a previously uploaded image/video by id.
// Immutable once uploaded, so cache aggressively.
router.get("/:id", async (req, res) => {
  const file = await prisma.uploadedFile.findUnique({ where: { id: req.params.id } });
  if (!file) return res.status(404).send("Not found");

  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(file.data);
});

export default router;
