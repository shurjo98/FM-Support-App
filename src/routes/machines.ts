// src/routes/machines.ts
import { Router } from "express";
import { machines, machineInstances } from "../store";
import type { ProductLine } from "../types";

const router = Router();

// GET /machines -> list machine models, optionally filtered by ?productLine=
router.get("/", (req, res) => {
  const { productLine } = req.query as { productLine?: ProductLine };
  const rows = productLine ? machines.filter((m) => m.productLine === productLine) : machines;
  res.json(rows);
});

// GET /machines/:machineId/instances → list serials for one machine
router.get("/:machineId/instances", (req, res) => {
  const { machineId } = req.params;
  const list = machineInstances.filter((mi) => mi.machineId === machineId);
  res.json(list);
});

export default router;
