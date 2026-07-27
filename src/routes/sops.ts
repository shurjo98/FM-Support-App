// src/routes/sops.ts
import { Router } from "express";
import { prisma } from "../db";
import { storeFile } from "../services/fileStorage";
import express from "express";

const router = Router();

function mkId() {
  return `sop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// GET /sops?organizationId=X
// Standardized work is per machine MODEL (Machine), not per serial number —
// every machine model this org actually has an instance of, with its SOP if
// one exists, so the frontend can show "documented" vs "not documented yet".
router.get("/", async (req, res) => {
  const { organizationId } = req.query as { organizationId?: string };
  if (!organizationId) return res.status(400).json({ error: "organizationId required" });

  const instances = await prisma.machineInstance.findMany({
    where: { organizationId, machineId: { not: null } },
    include: { machine: { include: { sop: true } } },
  });

  const byMachine = new Map<string, { id: string; name: string; brand: string; category: string | null; sop: { steps: string[]; photoIds: string[]; updatedAt: string; updatedBy: string | null } | null }>();
  for (const inst of instances) {
    const m = inst.machine;
    if (!m || byMachine.has(m.id)) continue;
    byMachine.set(m.id, {
      id: m.id,
      name: m.name,
      brand: m.brand,
      category: m.category,
      sop: m.sop
        ? { steps: m.sop.steps, photoIds: m.sop.photoIds, updatedAt: m.sop.updatedAt.toISOString(), updatedBy: m.sop.updatedBy }
        : null,
    });
  }

  res.json(Array.from(byMachine.values()).sort((a, b) => a.name.localeCompare(b.name)));
});

// PUT /sops/:machineId — create or replace the steps for a machine's SOP
router.put("/:machineId", async (req, res) => {
  const { machineId } = req.params;
  const { steps, updatedBy } = req.body as { steps: string[]; updatedBy?: string };
  if (!Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ error: "steps (non-empty array) required" });
  }

  const machine = await prisma.machine.findUnique({ where: { id: machineId } });
  if (!machine) return res.status(404).json({ error: "Machine not found" });

  const sop = await prisma.sop.upsert({
    where: { machineId },
    update: { steps, updatedBy: updatedBy ?? null },
    create: { id: mkId(), machineId, steps, photoIds: [], updatedBy: updatedBy ?? null },
  });

  res.json({ ...sop, updatedAt: sop.updatedAt.toISOString() });
});

// POST /sops/:machineId/photo — mirrors audit.ts's document-upload pattern
// exactly: raw binary body, stored via the shared UploadedFile blob store
// (Render's filesystem is ephemeral, so nothing is ever written to disk).
router.post(
  "/:machineId/photo",
  express.raw({ type: ["image/*"], limit: "10mb" }),
  async (req, res) => {
    const { machineId } = req.params;
    const contentType = req.headers["content-type"] ?? "application/octet-stream";
    const data = req.body as Buffer;
    if (!data?.length) return res.status(400).json({ error: "No file body" });

    const machine = await prisma.machine.findUnique({ where: { id: machineId }, include: { sop: true } });
    if (!machine) return res.status(404).json({ error: "Machine not found" });

    const url = await storeFile(contentType, data);
    const fileId = url.split("/").pop()!;

    const sop = await prisma.sop.upsert({
      where: { machineId },
      update: { photoIds: { push: fileId } },
      create: { id: mkId(), machineId, steps: [], photoIds: [fileId] },
    });

    res.json({ ...sop, updatedAt: sop.updatedAt.toISOString() });
  }
);

export default router;
