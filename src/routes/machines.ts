// src/routes/machines.ts
import { Router } from "express";
import { prisma } from "../db";
import type { ProductLine } from "../types";
import { requireInternalAuth } from "../middleware/requireInternalAuth";

const router = Router();

// GET /machines -> list machine models, optionally filtered by ?productLine=
// and/or ?organizationId= (only machines that factory actually owns —
// used by the report-issue flow so every card shown is reportable).
router.get("/", async (req, res) => {
  const { productLine, organizationId } = req.query as { productLine?: ProductLine; organizationId?: string };
  const rows = await prisma.machine.findMany({
    where: {
      ...(productLine ? { productLine } : {}),
      ...(organizationId ? { organizationId } : {}),
    },
  });
  res.json(rows);
});

function withMaintenanceStatus<T extends { lastServicedAt: Date | null; serviceIntervalMonths: number | null }>(
  instance: T
) {
  let nextServiceDue: string | null = null;
  let serviceStatus: "ok" | "due_soon" | "overdue" | "unscheduled" = "unscheduled";

  if (instance.lastServicedAt && instance.serviceIntervalMonths) {
    const due = new Date(instance.lastServicedAt);
    due.setMonth(due.getMonth() + instance.serviceIntervalMonths);
    nextServiceDue = due.toISOString();
    const daysUntilDue = (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    serviceStatus = daysUntilDue < 0 ? "overdue" : daysUntilDue <= 14 ? "due_soon" : "ok";
  }

  return { ...instance, nextServiceDue, serviceStatus };
}

// GET /machines/instances?organizationId=X -> the factory's *other-brand*
// equipment (registered one at a time) for the "My Equipment" page. FM's own
// catalog machines already have a good browsing UX on the Sewing/Automated
// Machines pages — those are bulk-purchased (often dozens of identical
// units per model), so listing every individual serial here as its own
// card would be unusable. This stays focused on the small, deliberately
// curated list of non-catalog machines a factory adds.
router.get("/instances", async (req, res) => {
  const { organizationId } = req.query as { organizationId?: string };
  if (!organizationId) return res.status(400).json({ error: "organizationId is required" });

  const instances = await prisma.machineInstance.findMany({
    where: { organizationId, machineId: null },
    include: { machine: true },
    orderBy: { id: "asc" },
  });

  const rows = instances.map((i) => {
    const displayName = i.machine?.name ?? i.customName ?? "Unnamed machine";
    const displayBrand = i.machine?.brand ?? i.brand ?? "Unknown";
    const displayCategory = i.machine?.category ?? i.category ?? null;
    return withMaintenanceStatus({
      id: i.id,
      serialNumber: i.serialNumber,
      machineId: i.machineId,
      organizationId: i.organizationId,
      location: i.location,
      displayName,
      displayBrand,
      displayCategory,
      isCatalogMachine: Boolean(i.machineId),
      imageUrl: i.machine?.imageUrl ?? null,
      lastServicedAt: i.lastServicedAt,
      serviceIntervalMonths: i.serviceIntervalMonths,
    });
  });

  res.json(rows);
});

// POST /machines/instances -> register a machine of any brand (FM or
// otherwise) that the factory owns, so it shows up in their equipment list
// and can have tickets/maintenance tracked against it.
router.post("/instances", async (req, res) => {
  const { organizationId, serialNumber, brand, customName, category, location } = req.body as {
    organizationId: string;
    serialNumber: string;
    brand: string;
    customName: string;
    category?: string;
    location?: string;
  };

  if (!organizationId || !serialNumber?.trim() || !brand?.trim() || !customName?.trim()) {
    return res.status(400).json({ error: "organizationId, serialNumber, brand, and customName are required" });
  }

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return res.status(400).json({ error: "Invalid organizationId" });

  const existing = await prisma.machineInstance.findUnique({ where: { serialNumber: serialNumber.trim() } });
  if (existing) return res.status(409).json({ error: "That serial number is already registered." });

  const instance = await prisma.machineInstance.create({
    data: {
      id: `mi-custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      serialNumber: serialNumber.trim(),
      organizationId,
      brand: brand.trim(),
      customName: customName.trim(),
      category: category?.trim() || null,
      location: location?.trim() || null,
    },
  });

  res.status(201).json(
    withMaintenanceStatus({
      id: instance.id,
      serialNumber: instance.serialNumber,
      machineId: instance.machineId,
      organizationId: instance.organizationId,
      location: instance.location,
      displayName: instance.customName!,
      displayBrand: instance.brand!,
      displayCategory: instance.category,
      isCatalogMachine: false,
      imageUrl: null,
      lastServicedAt: instance.lastServicedAt,
      serviceIntervalMonths: instance.serviceIntervalMonths,
    })
  );
});

// PATCH /machines/instances/:id -> update location/service interval
router.patch("/instances/:id", async (req, res) => {
  const { id } = req.params;
  const { serviceIntervalMonths, location } = req.body as { serviceIntervalMonths?: number | null; location?: string };

  const instance = await prisma.machineInstance.findUnique({ where: { id } });
  if (!instance) return res.status(404).json({ error: "Machine instance not found" });

  const updated = await prisma.machineInstance.update({
    where: { id },
    data: {
      ...(serviceIntervalMonths !== undefined ? { serviceIntervalMonths } : {}),
      ...(location !== undefined ? { location } : {}),
    },
  });

  res.json(updated);
});

// PATCH /machines/instances/:id/service -> mark serviced today
router.patch("/instances/:id/service", async (req, res) => {
  const { id } = req.params;
  const instance = await prisma.machineInstance.findUnique({ where: { id } });
  if (!instance) return res.status(404).json({ error: "Machine instance not found" });

  const updated = await prisma.machineInstance.update({
    where: { id },
    data: { lastServicedAt: new Date() },
  });

  res.json(updated);
});

// GET /machines/:machineId/instances -> list serials for one machine,
// optionally restricted to the customer's own factory via ?organizationId=
router.get("/:machineId/instances", async (req, res) => {
  const { machineId } = req.params;
  const { organizationId } = req.query as { organizationId?: string };
  const list = await prisma.machineInstance.findMany({
    where: {
      machineId,
      ...(organizationId ? { organizationId } : {}),
    },
  });
  res.json(list);
});

// POST /machines/:machineId/instances -> internal-staff-only: attach a real
// catalog machine (a specific Jack model, with photos and manual-backed
// troubleshooting already loaded) to a client's factory under a real serial
// number. Distinct from POST /machines/instances above, which is the
// customer-facing "My Equipment" flow for ad-hoc/other-brand machines
// (machineId: null) — without this route, a newly onboarded factory's
// Sewing/Automated Machines catalog page had no way to show any of FM's own
// machines, only whatever the customer registered themselves.
//
// Machine rows are org-scoped (GET /machines?organizationId= filters on the
// Machine's OWN organizationId, not on whether an instance exists), so every
// factory needs its own Machine row per model — :machineId here is treated
// as a template to copy from (whichever org happens to own that row),
// reusing an existing same-model row for the target org if one was already
// created, rather than attaching the instance to the source org's row.
router.post("/:machineId/instances", requireInternalAuth, async (req, res) => {
  const { machineId } = req.params;
  const { organizationId, serialNumber, location, serviceIntervalMonths } = req.body as {
    organizationId?: string;
    serialNumber?: string;
    location?: string;
    serviceIntervalMonths?: number;
  };

  if (!organizationId?.trim() || !serialNumber?.trim()) {
    return res.status(400).json({ error: "organizationId and serialNumber are required" });
  }

  const template = await prisma.machine.findUnique({ where: { id: machineId } });
  if (!template) return res.status(404).json({ error: "Machine model not found" });

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return res.status(400).json({ error: "Invalid organizationId" });

  const existing = await prisma.machineInstance.findUnique({ where: { serialNumber: serialNumber.trim() } });
  if (existing) return res.status(409).json({ error: "That serial number is already registered." });

  let orgMachine = await prisma.machine.findFirst({ where: { organizationId, model: template.model } });
  if (!orgMachine) {
    orgMachine = await prisma.machine.create({
      data: {
        id: `m-${organizationId}-${template.model.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: template.name,
        model: template.model,
        brand: template.brand,
        organizationId,
        productLine: template.productLine,
        category: template.category,
        imageUrl: template.imageUrl,
        images: template.images,
        description: template.description,
      },
    });
  }

  const instance = await prisma.machineInstance.create({
    data: {
      id: `mi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      serialNumber: serialNumber.trim(),
      machineId: orgMachine.id,
      organizationId,
      location: location?.trim() || null,
      serviceIntervalMonths: serviceIntervalMonths ?? null,
    },
  });

  res.status(201).json(withMaintenanceStatus(instance));
});

export default router;
