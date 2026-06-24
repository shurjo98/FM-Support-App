// src/routes/reorders.ts
import { Router } from "express";
import { prisma } from "../db";
import type { PurchaseItemType } from "../types";
import type { Prisma } from "@prisma/client";

const router = Router();

type ReorderWithRelations = Prisma.ReorderRequestGetPayload<{
  include: { organization: true; requestedBy: true; needleProduct: true; sparePart: true; machine: true };
}>;

function enrich(r: ReorderWithRelations) {
  return {
    id: r.id,
    organizationId: r.organizationId,
    organizationName: r.organization?.name ?? r.organizationId,
    requestedByUserId: r.requestedByUserId,
    requestedByName: r.requestedBy?.name ?? r.requestedByUserId,
    itemType: r.itemType,
    itemName: r.itemName,
    needleSystem: r.needleProduct?.system,
    sparePartName: r.sparePart?.name,
    machineModel: r.machine?.model,
    serialNumber: r.serialNumber,
    quantity: r.quantity,
    status: r.status,
    createdAt: r.createdAt,
  };
}

const include = { organization: true, requestedBy: true, needleProduct: true, sparePart: true, machine: true };

// GET /reorders?organizationId= -> a factory's own reorder requests
router.get("/", async (req, res) => {
  const { organizationId } = req.query as { organizationId?: string };
  const rows = await prisma.reorderRequest.findMany({
    where: organizationId ? { organizationId } : {},
    include,
    orderBy: { createdAt: "desc" },
  });
  res.json(rows.map(enrich));
});

// POST /reorders -> request a restock of a previously purchased (or
// catalog) item. Open to any logged-in customer user, not just IEs —
// ordering supplies isn't a "raise an issue" action.
router.post("/", async (req, res) => {
  const {
    organizationId,
    requestedByUserId,
    itemType,
    itemName,
    needleProductId,
    sparePartId,
    machineId,
    serialNumber,
    quantity,
  } = req.body as {
    organizationId: string;
    requestedByUserId: string;
    itemType: PurchaseItemType;
    itemName: string;
    needleProductId?: string;
    sparePartId?: string;
    machineId?: string;
    serialNumber?: string;
    quantity: number;
  };

  const [org, user] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.user.findUnique({ where: { id: requestedByUserId } }),
  ]);

  if (!org) return res.status(400).json({ error: "Invalid organizationId" });
  if (!user) return res.status(400).json({ error: "Invalid requestedByUserId" });
  if (!itemName || !quantity || quantity <= 0) {
    return res.status(400).json({ error: "itemName and a positive quantity are required" });
  }

  const newRequest = await prisma.reorderRequest.create({
    data: {
      id: `r-${Date.now()}`,
      organizationId,
      requestedByUserId,
      itemType,
      itemName,
      needleProductId: needleProductId ?? null,
      sparePartId: sparePartId ?? null,
      machineId: machineId ?? null,
      serialNumber: serialNumber ?? null,
      quantity,
      status: "PENDING",
    },
    include,
  });

  res.status(201).json(enrich(newRequest));
});

export default router;
