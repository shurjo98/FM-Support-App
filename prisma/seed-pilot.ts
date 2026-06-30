/**
 * Pilot seed: Evergreen Garments Ltd, Dhaka
 * Run: npx ts-node prisma/seed-pilot.ts
 *
 * Idempotent — safe to run multiple times (upserts everything).
 * PIN is set to 1234 for this pilot factory.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ORG_ID   = "org-evergreen-001";
const IE_ID    = "user-ie-evergreen-001";
const PIN      = "1234";

const MACHINE_DEFS = [
  { id: "m-jk8500d", name: "JK-8500D High Speed Lockstitch", model: "JK-8500D", productLine: "Sewing Machines", category: "Lockstitch" },
  { id: "m-jk8700d", name: "JK-8700D Lockstitch w/ Needle Positioner", model: "JK-8700D", productLine: "Sewing Machines", category: "Lockstitch" },
  { id: "m-jkt1906", name: "JK-T1906 Electronic Bartack", model: "JK-T1906", productLine: "Sewing Machines", category: "Bartack" },
  { id: "m-jkt781d", name: "JK-T781D Overlock", model: "JK-T781D", productLine: "Sewing Machines", category: "Overlock" },
  { id: "m-jkw4",   name: "JK-W4 Interlock / Flatbed", model: "JK-W4",   productLine: "Sewing Machines", category: "Interlock" },
];

const NEEDLE_DEFS = [
  { id: "n-gb134", name: "Groz-Beckert 134 Standard", system: "134", brand: "Groz-Beckert", imageUrl: "", description: "Standard lockstitch needle for woven fabrics" },
  { id: "n-gb149", name: "Groz-Beckert 149×5 Serger", system: "149x5", brand: "Groz-Beckert", imageUrl: "", description: "Overlock needle for knit and woven" },
  { id: "n-gb135", name: "Groz-Beckert 135×5 Lockstitch", system: "135x5", brand: "Groz-Beckert", imageUrl: "", description: "Industrial lockstitch for heavy fabrics" },
];

// 22 machine instances across 2 lines
const INSTANCES = [
  // Line A – 12 machines
  { id: "mi-A01", sn: "EG-A-001", machineId: "m-jk8500d", loc: "Line A", lastSvc: daysAgo(20),  svcInterval: 3 },
  { id: "mi-A02", sn: "EG-A-002", machineId: "m-jk8500d", loc: "Line A", lastSvc: daysAgo(45),  svcInterval: 3 },
  { id: "mi-A03", sn: "EG-A-003", machineId: "m-jk8500d", loc: "Line A", lastSvc: daysAgo(10),  svcInterval: 3 },
  { id: "mi-A04", sn: "EG-A-004", machineId: "m-jk8700d", loc: "Line A", lastSvc: daysAgo(80),  svcInterval: 3 },
  { id: "mi-A05", sn: "EG-A-005", machineId: "m-jk8700d", loc: "Line A", lastSvc: daysAgo(5),   svcInterval: 3 },
  { id: "mi-A06", sn: "EG-A-006", machineId: "m-jk8500d", loc: "Line A", lastSvc: daysAgo(30),  svcInterval: 3 },
  { id: "mi-A07", sn: "EG-A-007", machineId: "m-jkt1906", loc: "Line A", lastSvc: daysAgo(15),  svcInterval: 6 },
  { id: "mi-A08", sn: "EG-A-008", machineId: "m-jk8500d", loc: "Line A", lastSvc: daysAgo(60),  svcInterval: 3 },
  { id: "mi-A09", sn: "EG-A-009", machineId: "m-jk8500d", loc: "Line A", lastSvc: null,          svcInterval: null },
  { id: "mi-A10", sn: "EG-A-010", machineId: "m-jkt781d", loc: "Line A", lastSvc: daysAgo(7),   svcInterval: 2 },
  { id: "mi-A11", sn: "EG-A-011", machineId: "m-jkw4",    loc: "Line A", lastSvc: daysAgo(35),  svcInterval: 3 },
  { id: "mi-A12", sn: "EG-A-012", machineId: "m-jk8700d", loc: "Line A", lastSvc: daysAgo(95),  svcInterval: 3 },
  // Line B – 10 machines
  { id: "mi-B01", sn: "EG-B-001", machineId: "m-jk8500d", loc: "Line B", lastSvc: daysAgo(12),  svcInterval: 3 },
  { id: "mi-B02", sn: "EG-B-002", machineId: "m-jk8500d", loc: "Line B", lastSvc: daysAgo(25),  svcInterval: 3 },
  { id: "mi-B03", sn: "EG-B-003", machineId: "m-jk8700d", loc: "Line B", lastSvc: daysAgo(50),  svcInterval: 3 },
  { id: "mi-B04", sn: "EG-B-004", machineId: "m-jkt781d", loc: "Line B", lastSvc: daysAgo(18),  svcInterval: 2 },
  { id: "mi-B05", sn: "EG-B-005", machineId: "m-jkw4",    loc: "Line B", lastSvc: daysAgo(40),  svcInterval: 3 },
  { id: "mi-B06", sn: "EG-B-006", machineId: "m-jk8500d", loc: "Line B", lastSvc: daysAgo(3),   svcInterval: 3 },
  { id: "mi-B07", sn: "EG-B-007", machineId: "m-jk8500d", loc: "Line B", lastSvc: daysAgo(70),  svcInterval: 3 },
  { id: "mi-B08", sn: "EG-B-008", machineId: "m-jkt1906", loc: "Line B", lastSvc: daysAgo(28),  svcInterval: 6 },
  { id: "mi-B09", sn: "EG-B-009", machineId: "m-jk8700d", loc: "Line B", lastSvc: daysAgo(55),  svcInterval: 3 },
  { id: "mi-B10", sn: "EG-B-010", machineId: "m-jk8500d", loc: "Line B", lastSvc: null,          svcInterval: null },
];

// 10 closed tickets (with resolution events) + 2 open
const TICKETS = [
  { id: "tkt-001", sn: "EG-A-004", machineId: "m-jk8700d", issue: "THREAD_BREAKING",  desc: "Upper thread breaking every 20 minutes on needle size 14", daysAgo: 60, resolvedAfterH: 3.5  },
  { id: "tkt-002", sn: "EG-A-008", machineId: "m-jk8500d", issue: "STITCH_SKIPPING",   desc: "Skipping stitches on lightweight chiffon fabric", daysAgo: 55, resolvedAfterH: 5    },
  { id: "tkt-003", sn: "EG-B-003", machineId: "m-jk8700d", issue: "NOISE",             desc: "Loud rattling sound from machine bed during operation", daysAgo: 50, resolvedAfterH: 2    },
  { id: "tkt-004", sn: "EG-A-012", machineId: "m-jk8700d", issue: "FABRIC_NOT_FEEDING", desc: "Fabric feed irregular at high speed", daysAgo: 45, resolvedAfterH: 4    },
  { id: "tkt-005", sn: "EG-B-007", machineId: "m-jk8500d", issue: "NEEDLE_BREAKING",   desc: "Needle breaking on denim fabric, size 16 needle", daysAgo: 40, resolvedAfterH: 1.5  },
  { id: "tkt-006", sn: "EG-A-002", machineId: "m-jk8500d", issue: "TENSION_PROBLEM",   desc: "Stitch tension too tight on left side of seam", daysAgo: 35, resolvedAfterH: 2.5  },
  { id: "tkt-007", sn: "EG-A-010", machineId: "m-jkt781d", issue: "THREAD_BREAKING",   desc: "Looper thread breaking during overlock operation", daysAgo: 28, resolvedAfterH: 6    },
  { id: "tkt-008", sn: "EG-B-009", machineId: "m-jk8700d", issue: "STITCH_SKIPPING",   desc: "Intermittent stitch skipping on knit fabric", daysAgo: 20, resolvedAfterH: 4    },
  { id: "tkt-009", sn: "EG-A-011", machineId: "m-jkw4",    issue: "NOISE",             desc: "Vibration noise from interlock machine at high speed", daysAgo: 14, resolvedAfterH: 3    },
  { id: "tkt-010", sn: "EG-B-005", machineId: "m-jkw4",    issue: "FABRIC_NOT_FEEDING", desc: "Differential feed not working correctly", daysAgo: 10, resolvedAfterH: 5    },
  // Open tickets
  { id: "tkt-011", sn: "EG-A-009", machineId: "m-jk8500d", issue: "THREAD_BREAKING",   desc: "Thread breaking frequently, tried 3 needle changes already", daysAgo: 3,  resolvedAfterH: null },
  { id: "tkt-012", sn: "EG-B-002", machineId: "m-jk8500d", issue: "TENSION_PROBLEM",   desc: "Bobbin tension inconsistent, garments being rejected by QC", daysAgo: 1,  resolvedAfterH: null },
];

// 4 months of needle purchases
const NEEDLE_PURCHASES = [
  { id: "pur-n01", needleId: "n-gb134", qty: 500, price: 12, daysAgo: 120, name: "Groz-Beckert 134 Standard" },
  { id: "pur-n02", needleId: "n-gb149", qty: 200, price: 14, daysAgo: 110, name: "Groz-Beckert 149×5 Serger" },
  { id: "pur-n03", needleId: "n-gb134", qty: 600, price: 12, daysAgo: 90,  name: "Groz-Beckert 134 Standard" },
  { id: "pur-n04", needleId: "n-gb135", qty: 300, price: 15, daysAgo: 75,  name: "Groz-Beckert 135×5 Lockstitch" },
  { id: "pur-n05", needleId: "n-gb134", qty: 800, price: 12, daysAgo: 60,  name: "Groz-Beckert 134 Standard" },
  { id: "pur-n06", needleId: "n-gb149", qty: 250, price: 14, daysAgo: 45,  name: "Groz-Beckert 149×5 Serger" },
  { id: "pur-n07", needleId: "n-gb134", qty: 700, price: 12, daysAgo: 30,  name: "Groz-Beckert 134 Standard" },
  { id: "pur-n08", needleId: "n-gb135", qty: 400, price: 15, daysAgo: 15,  name: "Groz-Beckert 135×5 Lockstitch" },
  { id: "pur-n09", needleId: "n-gb134", qty: 1000, price: 12, daysAgo: 5,   name: "Groz-Beckert 134 Standard" },
];

// Stock items (spare parts in inventory)
const STOCK_ITEMS = [
  { id: "stk-001", name: "Bobbin Case JK-8500D",       qty: 8,  min: 3, unit: "pcs" },
  { id: "stk-002", name: "Presser Foot Standard",       qty: 2,  min: 5, unit: "pcs" },
  { id: "stk-003", name: "Feed Dog JK-8700D",          qty: 4,  min: 3, unit: "pcs" },
  { id: "stk-004", name: "Needle Clamp Screw",         qty: 25, min: 10, unit: "pcs" },
  { id: "stk-005", name: "Machine Oil (500ml)",        qty: 1,  min: 2, unit: "bottles" },
  { id: "stk-006", name: "Looper JK-T781D Overlock",   qty: 0,  min: 2, unit: "pcs" },
  { id: "stk-007", name: "Throat Plate JK-8500D",      qty: 3,  min: 2, unit: "pcs" },
];

// 3 weeks of defect logs
const DEFECT_LOGS: { sn: string; machineName: string; type: string; count: number; shift: string; daysAgo: number }[] = [
  { sn: "EG-A-001", machineName: "JK-8500D (EG-A-001)", type: "SKIP_STITCH",   count: 12, shift: "MORNING", daysAgo: 21 },
  { sn: "EG-A-004", machineName: "JK-8700D (EG-A-004)", type: "TENSION",       count: 8,  shift: "MORNING", daysAgo: 20 },
  { sn: "EG-B-002", machineName: "JK-8500D (EG-B-002)", type: "BROKEN_STITCH", count: 5,  shift: "EVENING", daysAgo: 19 },
  { sn: "EG-A-009", machineName: "JK-8500D (EG-A-009)", type: "SKIP_STITCH",   count: 18, shift: "MORNING", daysAgo: 18 },
  { sn: "EG-A-009", machineName: "JK-8500D (EG-A-009)", type: "TENSION",       count: 10, shift: "EVENING", daysAgo: 18 },
  { sn: "EG-B-003", machineName: "JK-8700D (EG-B-003)", type: "PUCKERING",     count: 7,  shift: "MORNING", daysAgo: 17 },
  { sn: "EG-A-001", machineName: "JK-8500D (EG-A-001)", type: "SKIP_STITCH",   count: 9,  shift: "MORNING", daysAgo: 15 },
  { sn: "EG-A-004", machineName: "JK-8700D (EG-A-004)", type: "NEEDLE_HOLE",   count: 14, shift: "MORNING", daysAgo: 14 },
  { sn: "EG-A-009", machineName: "JK-8500D (EG-A-009)", type: "SKIP_STITCH",   count: 22, shift: "MORNING", daysAgo: 12 },
  { sn: "EG-A-009", machineName: "JK-8500D (EG-A-009)", type: "BROKEN_STITCH", count: 15, shift: "EVENING", daysAgo: 12 },
  { sn: "EG-B-007", machineName: "JK-8500D (EG-B-007)", type: "TENSION",       count: 6,  shift: "MORNING", daysAgo: 10 },
  { sn: "EG-A-008", machineName: "JK-8500D (EG-A-008)", type: "SKIP_STITCH",   count: 11, shift: "MORNING", daysAgo: 8  },
  { sn: "EG-B-002", machineName: "JK-8500D (EG-B-002)", type: "PUCKERING",     count: 4,  shift: "EVENING", daysAgo: 7  },
  { sn: "EG-A-009", machineName: "JK-8500D (EG-A-009)", type: "SKIP_STITCH",   count: 30, shift: "MORNING", daysAgo: 5  },
  { sn: "EG-A-009", machineName: "JK-8500D (EG-A-009)", type: "TENSION",       count: 20, shift: "EVENING", daysAgo: 5  },
  { sn: "EG-A-004", machineName: "JK-8700D (EG-A-004)", type: "NEEDLE_HOLE",   count: 9,  shift: "MORNING", daysAgo: 3  },
  { sn: "EG-B-009", machineName: "JK-8700D (EG-B-009)", type: "SKIP_STITCH",   count: 7,  shift: "MORNING", daysAgo: 2  },
  { sn: "EG-A-009", machineName: "JK-8500D (EG-A-009)", type: "SKIP_STITCH",   count: 35, shift: "MORNING", daysAgo: 1  },
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysAgoDate(n: number): string {
  const d = daysAgo(n);
  return d.toISOString().slice(0, 10);
}

function hoursAfter(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 3_600_000);
}

async function main() {
  console.log("🌱 Seeding pilot factory: Evergreen Garments Ltd…");

  // 1. Organization
  await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: { name: "Evergreen Garments Ltd", location: "Ashulia, Dhaka" },
    create: { id: ORG_ID, name: "Evergreen Garments Ltd", location: "Ashulia, Dhaka" },
  });

  // 2. Set PIN
  const hashed = await bcrypt.hash(PIN, 10);
  await prisma.organization.update({ where: { id: ORG_ID }, data: { portalPin: hashed } });
  console.log(`  ✓ PIN set to ${PIN}`);

  // 3. IE user
  await prisma.user.upsert({
    where: { id: IE_ID },
    update: { name: "Ruhul Amin", role: "IE", aiCredits: 50 },
    create: { id: IE_ID, name: "Ruhul Amin", organizationId: ORG_ID, role: "IE", aiCredits: 50 },
  });
  console.log("  ✓ IE user: Ruhul Amin");

  // 4. Machine catalog entries
  for (const m of MACHINE_DEFS) {
    await prisma.machine.upsert({
      where: { id: m.id },
      update: { name: m.name, model: m.model, productLine: m.productLine, category: m.category },
      create: { ...m, brand: "Jack", organizationId: ORG_ID },
    });
  }
  console.log(`  ✓ ${MACHINE_DEFS.length} machine catalog entries`);

  // 5. Needle products
  for (const n of NEEDLE_DEFS) {
    await prisma.needleProduct.upsert({
      where: { id: n.id },
      update: { name: n.name, system: n.system, brand: n.brand },
      create: { ...n },
    });
  }
  console.log(`  ✓ ${NEEDLE_DEFS.length} needle products`);

  // 6. Machine instances
  for (const inst of INSTANCES) {
    await prisma.machineInstance.upsert({
      where: { serialNumber: inst.sn },
      update: { location: inst.loc, lastServicedAt: inst.lastSvc, serviceIntervalMonths: inst.svcInterval },
      create: {
        id: inst.id, serialNumber: inst.sn, machineId: inst.machineId,
        organizationId: ORG_ID, location: inst.loc,
        lastServicedAt: inst.lastSvc ?? undefined,
        serviceIntervalMonths: inst.svcInterval ?? undefined,
        warrantyExpiresAt: new Date(Date.now() + 365 * 24 * 3_600_000),
      },
    });
  }
  console.log(`  ✓ ${INSTANCES.length} machine instances (Line A + Line B)`);

  // 7. Tickets + events
  for (const t of TICKETS) {
    const createdAt = daysAgo(t.daysAgo);
    const status = t.resolvedAfterH ? "COMPLETED" : "OPEN";
    await prisma.ticket.upsert({
      where: { id: t.id },
      update: { status },
      create: {
        id: t.id, machineId: t.machineId, serialNumber: t.sn,
        createdByUserId: IE_ID, issueType: t.issue,
        description: t.desc, status,
        createdAt,
      },
    });

    await prisma.ticketEvent.upsert({
      where: { id: `${t.id}-ev1` },
      update: {},
      create: {
        id: `${t.id}-ev1`, ticketId: t.id,
        type: "STATUS_CHANGED", description: "Ticket opened",
        authorName: "Ruhul Amin", createdAt,
      },
    });

    if (t.resolvedAfterH) {
      const resolvedAt = hoursAfter(createdAt, t.resolvedAfterH);
      await prisma.ticketEvent.upsert({
        where: { id: `${t.id}-ev2` },
        update: {},
        create: {
          id: `${t.id}-ev2`, ticketId: t.id,
          type: "STATUS_CHANGED",
          description: `Issue resolved — technician completed service on site. Machine operational.`,
          authorName: "FM Technician", createdAt: resolvedAt,
        },
      });
    }
  }
  console.log(`  ✓ ${TICKETS.length} tickets (${TICKETS.filter(t => !t.resolvedAfterH).length} open)`);

  // 8. Needle purchases
  for (const p of NEEDLE_PURCHASES) {
    await prisma.purchase.upsert({
      where: { id: p.id },
      update: { quantity: p.qty, unitPrice: p.price },
      create: {
        id: p.id, organizationId: ORG_ID,
        itemType: "NEEDLE", itemName: p.name,
        needleProductId: p.needleId,
        quantity: p.qty, unitPrice: p.price,
        purchaseDate: daysAgoDate(p.daysAgo),
      },
    });
  }
  console.log(`  ✓ ${NEEDLE_PURCHASES.length} needle purchases`);

  // 9. Spare parts stock
  for (const s of STOCK_ITEMS) {
    await prisma.sparePartStock.upsert({
      where: { id: s.id },
      update: { quantity: s.qty, minThreshold: s.min },
      create: {
        id: s.id, organizationId: ORG_ID,
        name: s.name, quantity: s.qty, minThreshold: s.min, unit: s.unit,
        updatedAt: new Date(),
      },
    });
  }
  console.log(`  ✓ ${STOCK_ITEMS.length} spare part stock entries`);

  // 10. Defect logs
  for (const [i, d] of DEFECT_LOGS.entries()) {
    const id = `dlg-eg-${String(i + 1).padStart(3, "0")}`;
    await prisma.defectLog.upsert({
      where: { id },
      update: { count: d.count },
      create: {
        id, organizationId: ORG_ID,
        serialNumber: d.sn, machineName: d.machineName,
        defectType: d.type, count: d.count, shift: d.shift,
        loggedAt: daysAgo(d.daysAgo),
        loggedByUserId: IE_ID,
      },
    });
  }
  console.log(`  ✓ ${DEFECT_LOGS.length} defect log entries`);

  console.log("\n✅ Pilot seed complete!");
  console.log(`   Factory: Evergreen Garments Ltd (Ashulia, Dhaka)`);
  console.log(`   Portal PIN: ${PIN}`);
  console.log(`   IE User: Ruhul Amin`);
  console.log(`   Machines: ${INSTANCES.length} (Line A: 12, Line B: 10)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
