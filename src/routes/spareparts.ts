// src/routes/spareparts.ts
import { Router } from "express";
import { prisma } from "../db";

const router = Router();

// GET /spareparts -> spare parts catalog we supply
router.get("/", async (req, res) => {
  res.json(await prisma.sparePart.findMany());
});

export default router;
