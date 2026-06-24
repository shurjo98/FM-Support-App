// src/routes/purchases.ts
import { Router } from "express";
import { prisma } from "../db";
import type { PurchaseItemType } from "../types";

const router = Router();

// GET /purchases -> purchase history, optionally filtered by
// ?organizationId=, ?itemType= (MACHINE | NEEDLE | SPARE_PART) and/or
// ?query= (matches model name, needle system, item name, or serial number)
router.get("/", async (req, res) => {
  const { organizationId, itemType, query } = req.query as {
    organizationId?: string;
    itemType?: PurchaseItemType;
    query?: string;
  };
  const q = query?.trim().toLowerCase();

  const purchases = await prisma.purchase.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      ...(itemType ? { itemType } : {}),
    },
    include: { organization: true, machine: true, needleProduct: true, sparePart: true },
  });

  const rows = purchases
    .filter((p) => {
      if (!q) return true;
      return (
        p.serialNumber?.toLowerCase().includes(q) ||
        p.machine?.model.toLowerCase().includes(q) ||
        p.needleProduct?.system.toLowerCase().includes(q) ||
        p.itemName.toLowerCase().includes(q)
      );
    })
    .map((p) => ({
      id: p.id,
      organizationId: p.organizationId,
      organizationName: p.organization?.name ?? p.organizationId,
      itemType: p.itemType,
      itemName: p.itemName,
      machineModel: p.machine?.model,
      needleSystem: p.needleProduct?.system,
      sparePartName: p.sparePart?.name,
      serialNumber: p.serialNumber,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      totalPrice: p.quantity * p.unitPrice,
      purchaseDate: p.purchaseDate,
    }))
    .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

  res.json(rows);
});

export default router;
