// src/routes/inventory.ts
import { Router } from "express";
import { prisma } from "../db";

const router = Router();

function mkId() {
  return `stk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// GET /inventory?organizationId=X
router.get("/", async (req, res) => {
  const { organizationId } = req.query as { organizationId?: string };
  if (!organizationId) return res.status(400).json({ error: "organizationId required" });

  const items = await prisma.sparePartStock.findMany({
    where: { organizationId },
    include: { sparePart: true },
    orderBy: { name: "asc" },
  });

  const rows = items.map((i) => ({
    id: i.id,
    name: i.name,
    sparePartId: i.sparePartId,
    quantity: i.quantity,
    minThreshold: i.minThreshold,
    unit: i.unit,
    low: i.quantity <= i.minThreshold,
    updatedAt: i.updatedAt.toISOString(),
  }));

  const lowCount = rows.filter((r) => r.low).length;
  res.json({ items: rows, lowCount });
});

// POST /inventory  — add a new stock item
router.post("/", async (req, res) => {
  const { organizationId, name, sparePartId, quantity, minThreshold, unit } = req.body as {
    organizationId: string;
    name: string;
    sparePartId?: string;
    quantity?: number;
    minThreshold?: number;
    unit?: string;
  };

  if (!organizationId || !name?.trim()) {
    return res.status(400).json({ error: "organizationId and name are required" });
  }

  const item = await prisma.sparePartStock.create({
    data: {
      id: mkId(),
      organizationId,
      name: name.trim(),
      sparePartId: sparePartId ?? null,
      quantity: quantity ?? 0,
      minThreshold: minThreshold ?? 2,
      unit: unit ?? "pcs",
    },
  });
  res.status(201).json(item);
});

// PATCH /inventory/:id  — edit quantity, threshold, or name
router.patch("/:id", async (req, res) => {
  const { name, quantity, minThreshold, unit } = req.body as {
    name?: string;
    quantity?: number;
    minThreshold?: number;
    unit?: string;
  };

  const item = await prisma.sparePartStock.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(quantity !== undefined ? { quantity } : {}),
      ...(minThreshold !== undefined ? { minThreshold } : {}),
      ...(unit !== undefined ? { unit } : {}),
    },
  });
  res.json(item);
});

// POST /inventory/:id/use  — deduct quantity (used during servicing)
router.post("/:id/use", async (req, res) => {
  const { qty } = req.body as { qty: number };
  if (!qty || qty < 1) return res.status(400).json({ error: "qty must be >= 1" });

  const existing = await prisma.sparePartStock.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Not found" });

  const newQty = Math.max(0, existing.quantity - qty);
  const item = await prisma.sparePartStock.update({
    where: { id: req.params.id },
    data: { quantity: newQty },
  });
  res.json({ ...item, low: item.quantity <= item.minThreshold });
});

// DELETE /inventory/:id
router.delete("/:id", async (req, res) => {
  await prisma.sparePartStock.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
