// src/routes/machines.ts
import { Router } from "express";
import { prisma } from "../db";
import type { ProductLine } from "../types";

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

export default router;
