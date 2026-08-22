/**
 * Shangu Group machine-list import.
 * Run: npx ts-node --transpile-only prisma/seed-shangu.ts
 *
 * Reads data/shangu_machine_list/shangu_machine_list.xlsx (the real device
 * export from Shangu's own gateway system) and loads it as two factories —
 * the sheet's organizationName column splits into "Farseeing Knit Composite
 * Ltd." and "VOYAGER APPARELS LTD.", both under Shangu Group's parentName —
 * linked by groupId "shangu-group" so the portal's Group Dashboard
 * (GroupDashboardPage.tsx) aggregates them.
 *
 * Idempotent — safe to re-run whenever Shangu sends an updated machine list
 * (just replace the .xlsx and run this again; upserts on serialNumber mean
 * existing machines are updated in place, not duplicated).
 *
 * "org-shangu-001" already existed as an empty pilot shell (portal login
 * "SHANGU", password set separately, not touched here) — reused here as
 * Farseeing (the larger of the two factories) rather than left empty, so
 * that login immediately shows real machines. Voyager is a new org with
 * its own portal login.
 */

import path from "path";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const XLSX_PATH = path.join(__dirname, "..", "data", "shangu_machine_list", "shangu_machine_list.xlsx");
const GROUP_ID = "shangu-group";

type Row = {
  deviceName: string | number;
  deviceId: string | number;
  organizationName: string;
  gatewayNo?: string | number;
  gatewayName?: string;
  parentName?: string;
  deviceCategory: string;
};

const ORGS: Record<string, { orgId: string; name: string; portalUserId: string; ieId: string; ieName: string; isNew: boolean }> = {
  "Farseeing Knit Composite Ltd.": {
    orgId: "org-shangu-001",
    name: "Farseeing Knit Composite Ltd.",
    portalUserId: "SHANGU",
    ieId: "user-ie-shangu-001",
    ieName: "Farseeing Team",
    isNew: false,
  },
  "VOYAGER APPARELS LTD.": {
    orgId: "org-voyager-001",
    name: "Voyager Apparels Ltd.",
    portalUserId: "VOYAGER",
    ieId: "user-ie-voyager-001",
    ieName: "Voyager Team",
    isNew: true,
  },
};

// deviceCategory (Chinese) -> catalog machine definition. Model codes match
// Jack's naming (A5E-A / C6 / 1900G-D / 1790G-D); images reuse the closest
// existing asset in the same model family — see the console note this
// script prints for A5E-A, which has no exact asset yet.
const MACHINE_DEFS: Record<string, {
  slug: string; name: string; model: string; productLine: "SEWING" | "AUTOMATED"; category: string;
  imageUrl: string;
}> = {
  "平缝机-A5E-A": {
    slug: "a5e-a", name: "A5E-A Lockstitch", model: "A5E-A", productLine: "SEWING", category: "Lockstitch",
    imageUrl: "/public/img/Lockstitch_Machines_Files/AMH2/a5e-bnx.png",
  },
  "包缝机-C6": {
    slug: "c6", name: "C6 Overlock", model: "C6", productLine: "SEWING", category: "Overlock",
    imageUrl: "/public/img/overlock/C6.png",
  },
  "套结机-1900G-D": {
    slug: "1900g-d", name: "T1900G-D Electronic Bartack", model: "1900G-D", productLine: "AUTOMATED", category: "Bartack",
    imageUrl: "/public/img/Special_Machine_Files/JK-T1900G/1900G.png",
  },
  "锁眼机-1790G-D": {
    slug: "1790g-d", name: "T1790G-D Buttonhole", model: "1790G-D", productLine: "AUTOMATED", category: "Buttonhole",
    imageUrl: "/public/img/Special_Machine_Files/JK-T1790G/1790G.png",
  },
};

function slugifySerial(id: string | number): string {
  return String(id).trim().replace(/[^A-Za-z0-9_-]+/g, "-");
}

// Both keyed lookups below are validated against the sheet up front (see the
// unknownOrgs/unknownCategories check in main()), so a miss here means that
// check was skipped, not a data quirk — throwing keeps that assumption honest
// rather than silently smuggling `undefined` past noUncheckedIndexedAccess.
function orgFor(organizationName: string) {
  const org = ORGS[organizationName];
  if (!org) throw new Error(`Unrecognized organizationName: ${organizationName}`);
  return org;
}

async function main() {
  console.log("🌱 Importing Shangu Group machine list…");

  const wb = XLSX.readFile(XLSX_PATH);
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) throw new Error("Workbook has no sheets");
  const sheet = wb.Sheets[firstSheetName]!;
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: null as unknown as string });
  console.log(`  📄 Read ${rows.length} rows from ${path.basename(XLSX_PATH)}`);

  const unknownOrgs = new Set<string>();
  const unknownCategories = new Set<string>();
  for (const r of rows) {
    if (!ORGS[r.organizationName]) unknownOrgs.add(r.organizationName);
    if (!MACHINE_DEFS[r.deviceCategory]) unknownCategories.add(r.deviceCategory);
  }
  if (unknownOrgs.size) throw new Error(`Unrecognized organizationName values: ${[...unknownOrgs].join(", ")}`);
  if (unknownCategories.size) throw new Error(`Unrecognized deviceCategory values: ${[...unknownCategories].join(", ")}`);

  // 1. Organizations
  for (const org of Object.values(ORGS)) {
    await prisma.organization.upsert({
      where: { id: org.orgId },
      update: { name: org.name, groupId: GROUP_ID },
      create: {
        id: org.orgId, name: org.name, groupId: GROUP_ID,
        portalUserId: org.portalUserId,
        // New orgs get a starter password following the pilot convention
        // (see seed-pilot.ts). Never touch an existing org's password.
        ...(org.isNew ? { portalPassword: "1111" } : {}),
      },
    });
    console.log(`  ✓ Organization: ${org.name} (${org.orgId})${org.isNew ? " [new]" : " [reused existing pilot shell]"}`);
  }

  // 2. IE users (portal login requires one per org — see portal.ts)
  for (const org of Object.values(ORGS)) {
    await prisma.user.upsert({
      where: { id: org.ieId },
      update: { name: org.ieName },
      create: { id: org.ieId, name: org.ieName, organizationId: org.orgId, role: "IE", aiCredits: 50 },
    });
  }
  console.log(`  ✓ ${Object.keys(ORGS).length} IE portal-login users`);

  // 3. Machine catalog rows — one per (org, model), Machine rows are
  // org-scoped in this schema (see machines.ts's POST /:machineId/instances
  // comment), so each factory needs its own copy even though they buy the
  // same models.
  const machineIdByOrgAndCategory = new Map<string, string>();
  for (const org of Object.values(ORGS)) {
    for (const [catKey, def] of Object.entries(MACHINE_DEFS)) {
      const id = `m-${org.orgId}-${def.slug}`;
      await prisma.machine.upsert({
        where: { id },
        update: {
          name: def.name, model: def.model, productLine: def.productLine,
          category: def.category, imageUrl: def.imageUrl, images: [def.imageUrl],
        },
        create: {
          id, name: def.name, model: def.model, brand: "Jack",
          organizationId: org.orgId, productLine: def.productLine, category: def.category,
          imageUrl: def.imageUrl, images: [def.imageUrl],
        },
      });
      machineIdByOrgAndCategory.set(`${org.orgId}:${catKey}`, id);
    }
  }
  console.log(`  ✓ ${Object.values(ORGS).length * Object.keys(MACHINE_DEFS).length} machine catalog entries`);

  // 4. Machine instances — one per physical device, keyed by its real
  // gateway-system deviceId (globally unique across the sheet).
  let created = 0;
  let updated = 0;
  for (const r of rows) {
    const org = orgFor(r.organizationName);
    const machineId = machineIdByOrgAndCategory.get(`${org.orgId}:${r.deviceCategory}`)!;
    const serialNumber = String(r.deviceId).trim();
    const location = (r.gatewayName || String(r.deviceName)).trim() || null;
    const id = `mi-shangu-${slugifySerial(r.deviceId)}`;

    const existing = await prisma.machineInstance.findUnique({ where: { serialNumber } });
    await prisma.machineInstance.upsert({
      where: { serialNumber },
      update: { machineId, organizationId: org.orgId, location },
      create: { id, serialNumber, machineId, organizationId: org.orgId, location },
    });
    if (existing) updated++; else created++;
  }
  console.log(`  ✓ Machine instances: ${created} created, ${updated} updated (${rows.length} total)`);

  for (const org of Object.values(ORGS)) {
    const count = rows.filter((r) => orgFor(r.organizationName).orgId === org.orgId).length;
    console.log(`     - ${org.name}: ${count} machines · portal login ${org.portalUserId}${org.isNew ? " / 1111" : " / (existing password)"}`);
  }

  console.log("\n✅ Shangu Group import complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
