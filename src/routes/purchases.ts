// src/routes/purchases.ts
import { Router } from "express";
import { purchases, organizations, machines, needleProducts } from "../store";
import type { PurchaseItemType } from "../types";

const router = Router();

// GET /purchases -> purchase history, optionally filtered by
// ?organizationId=, ?itemType= (MACHINE | NEEDLE | SPARE_PART) and/or
// ?query= (matches model name, needle system, item name, or serial number)
router.get("/", (req, res) => {
  const { organizationId, itemType, query } = req.query as {
    organizationId?: string;
    itemType?: PurchaseItemType;
    query?: string;
  };
  const q = query?.trim().toLowerCase();

  const rows = purchases
    .filter((p) => {
      if (organizationId && p.organizationId !== organizationId) return false;
      if (itemType && p.itemType !== itemType) return false;
      if (!q) return true;
      const machine = machines.find((m) => m.id === p.machineId);
      const needle = needleProducts.find((n) => n.id === p.needleProductId);
      return (
        p.serialNumber?.toLowerCase().includes(q) ||
        machine?.model.toLowerCase().includes(q) ||
        needle?.system.toLowerCase().includes(q) ||
        p.itemName.toLowerCase().includes(q)
      );
    })
    .map((p) => {
      const machine = machines.find((m) => m.id === p.machineId);
      const needle = needleProducts.find((n) => n.id === p.needleProductId);
      return {
        id: p.id,
        organizationId: p.organizationId,
        organizationName: organizations.find((o) => o.id === p.organizationId)?.name ?? p.organizationId,
        itemType: p.itemType,
        itemName: p.itemName,
        machineModel: machine?.model,
        needleSystem: needle?.system,
        serialNumber: p.serialNumber,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        totalPrice: p.quantity * p.unitPrice,
        purchaseDate: p.purchaseDate,
      };
    })
    .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

  res.json(rows);
});

export default router;
