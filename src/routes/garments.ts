// src/routes/garments.ts
import { Router } from "express";
import { prisma } from "../db";
import type { Machine, NeedleProduct } from "@prisma/client";

const router = Router();

// GET /garments -> "what should I use to sew shirts/pants/jeans?" guide,
// each entry enriched with the actual machine/needle catalog items.
function resolveMachines(allMachines: Machine[], ids: string[]) {
  const byId = new Map(allMachines.map((m) => [m.id, m]));
  return ids.map((id) => byId.get(id)).filter((m): m is Machine => Boolean(m));
}

function resolveNeedles(allNeedles: NeedleProduct[], ids: string[]) {
  const byId = new Map(allNeedles.map((n) => [n.id, n]));
  return ids.map((id) => byId.get(id)).filter((n): n is NeedleProduct => Boolean(n));
}

router.get("/", async (req, res) => {
  const [recommendations, allMachines, allNeedles] = await Promise.all([
    prisma.garmentRecommendation.findMany({
      include: { processes: { orderBy: { order: "asc" } } },
    }),
    prisma.machine.findMany(),
    prisma.needleProduct.findMany(),
  ]);

  const rows = recommendations.map((g) => ({
    garment: g.garment,
    name: g.name,
    description: g.description,
    machines: resolveMachines(allMachines, g.machineIds),
    needles: resolveNeedles(allNeedles, g.needleProductIds),
    processes: g.processes.map((p) => ({
      name: p.name,
      description: p.description,
      machines: resolveMachines(allMachines, p.machineIds),
      needles: resolveNeedles(allNeedles, p.needleProductIds),
    })),
  }));

  res.json(rows);
});

export default router;
