// src/routes/content.ts
import express, { Router } from "express";
import { prisma } from "../db";
import { storeFile } from "../services/fileStorage";

const router = Router();

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// POST /content/upload -> raw image bytes, Content-Type set to the file's
// mime type (same pattern as ticket attachments) -> { url }
router.post("/upload", express.raw({ type: IMAGE_MIME_TYPES, limit: "15mb" }), async (req, res) => {
  const mimeType = (req.headers["content-type"]?.toString() || "").split(";")[0]?.trim() ?? "";
  if (!IMAGE_MIME_TYPES.includes(mimeType)) return res.status(400).json({ error: "Unsupported image type" });

  const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");
  if (!buf.length) return res.status(400).json({ error: "Missing image bytes" });

  const url = await storeFile(mimeType, buf);
  res.status(201).json({ url });
});

// GET /content?published=true -> customer portal feed; omit the filter to
// see drafts too (internal Content Studio management view).
router.get("/", async (req, res) => {
  const { published } = req.query as { published?: string };
  const cards = await prisma.contentCard.findMany({
    where: published === "true" ? { published: true } : {},
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
  res.json(cards);
});

// POST /content -> create a card (any internal account can write content).
// imageUrl is the cover shown on the carousel; images is the rest of the
// "story" gallery shown when a customer opens the card.
router.post("/", async (req, res) => {
  const { title, subtitle, body, imageUrl, images, published, order, actingAccountId } = req.body as {
    title: string;
    subtitle?: string;
    body?: string;
    imageUrl: string;
    images?: string[];
    published?: boolean;
    order?: number;
    actingAccountId: string;
  };

  const author = await prisma.internalAccount.findUnique({ where: { id: actingAccountId } });
  if (!author) return res.status(401).json({ error: "Unknown acting account." });
  if (!title?.trim()) return res.status(400).json({ error: "title is required" });
  if (!imageUrl) return res.status(400).json({ error: "imageUrl is required" });

  const card = await prisma.contentCard.create({
    data: {
      id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      subtitle: subtitle ?? null,
      body: body ?? null,
      imageUrl,
      images: images ?? [],
      published: published ?? true,
      order: order ?? 0,
      createdByAccountId: author.id,
      createdByName: author.name,
    },
  });

  res.status(201).json(card);
});

// PATCH /content/:id -> edit fields and/or toggle published
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { title, subtitle, body, imageUrl, images, published, order } = req.body as {
    title?: string;
    subtitle?: string | null;
    body?: string | null;
    imageUrl?: string;
    images?: string[];
    published?: boolean;
    order?: number;
  };

  const card = await prisma.contentCard.findUnique({ where: { id } });
  if (!card) return res.status(404).json({ error: "Card not found" });

  const updated = await prisma.contentCard.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(subtitle !== undefined ? { subtitle } : {}),
      ...(body !== undefined ? { body } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...(images !== undefined ? { images } : {}),
      ...(published !== undefined ? { published } : {}),
      ...(order !== undefined ? { order } : {}),
    },
  });

  res.json(updated);
});

// DELETE /content/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const card = await prisma.contentCard.findUnique({ where: { id } });
  if (!card) return res.status(404).json({ error: "Card not found" });

  await prisma.contentCard.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
