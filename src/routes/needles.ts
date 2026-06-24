// src/routes/needles.ts
import { Router } from "express";
import { prisma } from "../db";

const router = Router();

// GET /needles -> Groz-Beckert needle catalog we supply to garment factories
router.get("/", async (req, res) => {
  res.json(await prisma.needleProduct.findMany());
});

export default router;
