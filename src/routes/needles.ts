// src/routes/needles.ts
import { Router } from "express";
import { needleProducts } from "../store";

const router = Router();

// GET /needles -> Groz-Beckert needle catalog we supply to garment factories
router.get("/", (req, res) => {
  res.json(needleProducts);
});

export default router;
