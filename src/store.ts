// src/store.ts
import type {
  Machine,
  Ticket,
  User,
  CachedAnswer,
  MachineInstance,
  Organization,
  InternalAccount,
  IssueType,
  Purchase,
  NeedleProduct,
  ReorderRequest,
  GarmentRecommendationSeed,
  SparePart,
  NotificationLogEntry,
  InternalTask,
  InternalNotification,
} from "./types";

let eventCounter = 0;
function mkEvent(
  type: Ticket["events"][number]["type"],
  description: string,
  authorName: string | undefined,
  at: number
) {
  eventCounter += 1;
  return { id: `ev-seed-${eventCounter}`, type, description, authorName, createdAt: new Date(at).toISOString() };
}

// Internal staff who can log into the internal dashboard and be assigned
// tickets/tasks. Demo-only plaintext credentials.
export const internalAccounts: InternalAccount[] = [
  { id: "mgr1", accountId: "faisal.manager", password: "fm12345", name: "Mehrab (Manager)", role: "MANAGER" },
  { id: "tech1", accountId: "rashed.tech", password: "fm12345", name: "Rashed (Technician)", role: "TECHNICIAN" },
  { id: "tech2", accountId: "nila.tech", password: "fm12345", name: "Nila (Technician)", role: "TECHNICIAN" },
  { id: "admin1", accountId: "FM", password: "1111", name: "FM Team", role: "ADMIN" },
  { id: "farhad", accountId: "farhad.manager", password: "fm12345", name: "Farhad (Manager)", role: "MANAGER" },
  { id: "manna", accountId: "manna.tech", password: "fm12345", name: "Manna", role: "TECHNICIAN" },
  { id: "alamin", accountId: "alamin.manager", password: "fm12345", name: "Al Amin (Manager)", role: "MANAGER" },
  { id: "shaon", accountId: "shaon.service", password: "fm12345", name: "Shaon (Head of Service)", role: "MANAGER" },
  { id: "liton", accountId: "liton.tech", password: "fm12345", name: "Liton", role: "TECHNICIAN" },
  { id: "bashu", accountId: "bashu.tech", password: "fm12345", name: "Bashu", role: "TECHNICIAN" },
  { id: "hares", accountId: "hares.mechanic", password: "fm12345", name: "Hares (Senior Mechanic)", role: "TECHNICIAN" },
  { id: "jashim", accountId: "jashim.mechanic", password: "fm12345", name: "Jashim (Senior Mechanic)", role: "TECHNICIAN" },
  { id: "selim", accountId: "selim.tech", password: "fm12345", name: "Selim", role: "TECHNICIAN" },
  { id: "farid", accountId: "farid.tech", password: "fm12345", name: "Farid", role: "TECHNICIAN" },
  { id: "noyon", accountId: "noyon.tech", password: "fm12345", name: "Noyon", role: "TECHNICIAN" },
  { id: "arman", accountId: "arman.office", password: "fm12345", name: "Arman (Office Manager)", role: "ADMIN" },
  { id: "abdurrahim", accountId: "abdurrahim.accounts", password: "fm12345", name: "Abdur Rahim (Stocks and Accounts)", role: "ADMIN" },
  { id: "riyad", accountId: "riyad.repairs", password: "fm12345", name: "Riyad (Repairs)", role: "TECHNICIAN" },
  { id: "mehedi", accountId: "mehedi.tech", password: "fm12345", name: "Mehedi", role: "TECHNICIAN" },
  { id: "hena", accountId: "hena.tech", password: "fm12345", name: "Hena (Marketing)", role: "TECHNICIAN" },
  { id: "rafin", accountId: "rafin.tech", password: "fm12345", name: "Rafin (Marketing)", role: "TECHNICIAN" },
  { id: "luke", accountId: "luke.tech", password: "fm12345", name: "Luke", role: "TECHNICIAN" },
];

export const organizations: Organization[] = [
  { id: "org1", name: "Dhaka Apparel Factory", location: "Dhaka" },
  { id: "org2", name: "Chittagong Garments Ltd", location: "Chittagong" },
  { id: "org3", name: "Gazipur Stitching Co", location: "Gazipur" },
];

export const machines: Machine[] = [
  {
    id: "m1",
    name: "Jack A4C",
    model: "A4C",
    organizationId: "org1",
    productLine: "SEWING",
    category: "lockstitch",
    imageUrl: "/public/machines/lockstitch/A10_plus.png",
  },
  {
    id: "m2",
    name: "Template Machine M9-A",
    model: "M9-A",
    organizationId: "org1",
    productLine: "AUTOMATED",
    category: "template",
    imageUrl: "/public/machines/template/j5.png",
  },
  {
    id: "m3",
    name: "Jack C5 Overlock",
    model: "C5",
    organizationId: "org2",
    productLine: "SEWING",
    category: "overlock",
    imageUrl: "/public/machines/overlock/C5.png",
  },
  {
    id: "m4",
    name: "Interlock K10 Automated",
    model: "K10",
    organizationId: "org1",
    productLine: "AUTOMATED",
    category: "interlock",
    imageUrl: "/public/machines/Interlock/K10.png",
  },
  {
    id: "m5",
    name: "Jack A4",
    model: "A4",
    organizationId: "org1",
    productLine: "SEWING",
    category: "lockstitch",
    imageUrl: "/public/machines/lockstitch/A4.png",
    description: "Entry-level direct-drive lockstitch machine for everyday garment sewing.",
  },
  {
    id: "m6",
    name: "Jack A5E",
    model: "A5E",
    organizationId: "org1",
    productLine: "SEWING",
    category: "lockstitch",
    imageUrl: "/public/machines/lockstitch/A5E.png",
    description: "Energy-saving lockstitch machine with integrated control box.",
  },
  {
    id: "m7",
    name: "Jack A60",
    model: "A60",
    organizationId: "org2",
    productLine: "SEWING",
    category: "lockstitch",
    imageUrl: "/public/machines/lockstitch/A60.png",
    description: "Computerized lockstitch machine with touchscreen panel.",
  },
  {
    id: "m8",
    name: "Jack A6F",
    model: "A6F",
    organizationId: "org2",
    productLine: "SEWING",
    category: "lockstitch",
    imageUrl: "/public/machines/lockstitch/A6f.png",
    description: "High-speed lockstitch machine for lightweight to medium fabrics.",
  },
  {
    id: "m9",
    name: "Jack A8+",
    model: "A8+",
    organizationId: "org3",
    productLine: "SEWING",
    category: "lockstitch",
    imageUrl: "/public/machines/lockstitch/A8_plus.png",
    description: "Premium auto-trimmer lockstitch machine for heavier production lines.",
  },
  {
    id: "m10",
    name: "Jack C5S Overlock",
    model: "C5S",
    organizationId: "org2",
    productLine: "SEWING",
    category: "overlock",
    imageUrl: "/public/machines/overlock/C5s.png",
    description: "Compact overlock machine with digital display.",
  },
  {
    id: "m11",
    name: "Jack C6 Overlock",
    model: "C6",
    organizationId: "org2",
    productLine: "SEWING",
    category: "overlock",
    imageUrl: "/public/machines/overlock/C6.png",
    images: ["/public/machines/overlock/C6.png", "/public/machines/overlock/C6_1.png"],
    description: "Direct-drive overlock machine with energy-saving motor.",
  },
  {
    id: "m12",
    name: "Jack C8 Overlock",
    model: "C8",
    organizationId: "org3",
    productLine: "SEWING",
    category: "overlock",
    imageUrl: "/public/machines/overlock/C8.png",
    images: ["/public/machines/overlock/C8.png", "/public/machines/overlock/C8_1.png"],
    description: "Heavy-duty overlock machine for high-volume finishing lines.",
  },
  {
    id: "m13",
    name: "Jack C7 Overlock",
    model: "C7",
    organizationId: "org1",
    productLine: "SEWING",
    category: "overlock",
    imageUrl: "/public/machines/overlock/2O1A0069.png",
    description: "Standard 5-thread overlock machine for safety-stitch seams.",
  },
  {
    id: "m14",
    name: "Jack J6 Template Machine",
    model: "J6",
    // org3 otherwise has zero AUTOMATED machines, which would dead-end its
    // IE on the Automated Machines report-issue flow.
    organizationId: "org3",
    productLine: "AUTOMATED",
    category: "template",
    imageUrl: "/public/machines/template/j6.png",
    description: "Large-bed automated template machine for pattern sewing on heavy panels.",
  },
  {
    id: "m15",
    name: "Jack Automatic Pocket Welting Machine",
    model: "T3",
    organizationId: "org2",
    productLine: "AUTOMATED",
    category: "welting",
    imageUrl: "/public/categories/welting.png",
    description: "Fully automated pocket welting machine with touchscreen program control.",
  },
];

// Groz-Beckert needle systems we supply to Bangladesh garment factories.
// Needles are a product line, not serialized machines, so they live in
// their own catalog rather than the `machines` list.
export const needleProducts: NeedleProduct[] = [
  {
    id: "n1",
    name: "DBx1 Round Point",
    system: "DBx1 (System 16x231)",
    brand: "Groz-Beckert",
    imageUrl: "/public/needles/packing_image_1.png",
    description: "Standard lockstitch needle for general apparel sewing.",
  },
  {
    id: "n2",
    name: "DCx27 Light Ball Point",
    system: "DCx27",
    brand: "Groz-Beckert",
    imageUrl: "/public/needles/packing_image_1 (1).png",
    description: "Overlock/safety-stitch needle for knit fabrics.",
  },
  {
    id: "n3",
    name: "UY128GAS Curved Point",
    system: "UY128GAS",
    brand: "Groz-Beckert",
    imageUrl: "/public/needles/packing_image_1 (2).png",
    description: "Coverstitch/interlock needle for automated machines.",
  },
  {
    id: "n4",
    name: "TQx7 Heavy Duty",
    system: "TQx7",
    brand: "Groz-Beckert",
    imageUrl: "/public/needles/packing_image_1 (3).png",
    description: "Heavy-duty needle for template and pattern machines.",
  },
  {
    id: "n5",
    name: "DPx5 Leather Point",
    system: "DPx5",
    brand: "Groz-Beckert",
    imageUrl: "/public/needles/packing_image_1 (4).png",
    description: "Leather/upholstery point needle for thick or heavy material stitching.",
  },
];

// Spare parts catalog. No product photography exists for these yet, so the
// frontend falls back to an icon — see SparePartsPage.tsx.
export const spareParts: SparePart[] = [
  {
    id: "sp1",
    name: "Bobbin Case",
    compatibleWith: "Lockstitch machines",
    description: "Holds the bobbin thread under the needle plate; replace if tension becomes inconsistent.",
  },
  {
    id: "sp2",
    name: "Presser Foot",
    compatibleWith: "Lockstitch & overlock machines",
    description: "Holds fabric flat against the feed dog while sewing; wears down with heavy use.",
  },
  {
    id: "sp3",
    name: "Feed Dog",
    compatibleWith: "Lockstitch machines",
    description: "Toothed plate that moves fabric forward each stitch; replace if teeth are worn smooth.",
  },
  {
    id: "sp4",
    name: "Rotary Hook",
    compatibleWith: "Lockstitch machines",
    description: "Forms the lockstitch by catching the needle thread loop; precision part, replace if damaged.",
  },
  {
    id: "sp5",
    name: "V-Belt",
    compatibleWith: "All machine types",
    description: "Drive belt connecting the motor to the machine head; replace if cracked or slipping.",
  },
  {
    id: "sp6",
    name: "Looper",
    compatibleWith: "Overlock & interlock machines",
    description: "Forms the overlock stitch loops on the underside of the fabric; precision part.",
  },
];

// "What should I use to sew X?" guide — maps a garment type to the
// machines + needles best suited for sewing it.
export const garmentRecommendations: GarmentRecommendationSeed[] = [
  {
    garment: "SHIRTS",
    name: "Shirts",
    description:
      "Lightweight woven shirting needs a clean, high-speed lockstitch for main seams and a light overlock for side seams and hems.",
    machineIds: ["m1", "m6", "m10"],
    needleProductIds: ["n1"],
  },
  {
    garment: "PANTS",
    name: "Pants",
    description:
      "Medium-weight trousers need a stronger lockstitch for main seams, an overlock for side seams, and a template machine for waistband and belt-loop bartacking.",
    machineIds: ["m9", "m3", "m2"],
    needleProductIds: ["n1", "n4"],
  },
  {
    garment: "JEANS",
    name: "Jeans",
    description:
      "Heavy denim needs a computerized heavy-duty lockstitch, a heavy-duty overlock for raw-edge seams, a large-bed template machine for pocket/yoke pattern stitching, and an automated welting machine for pockets.",
    machineIds: ["m7", "m12", "m14", "m15"],
    needleProductIds: ["n4", "n5"],
    processes: [
      {
        name: "Main Seam (Inseam / Outseam)",
        description:
          "Joins the leg panels with a strong, straight lockstitch seam able to handle multiple layers of heavy denim.",
        machineIds: ["m7"],
        needleProductIds: ["n4"],
      },
      {
        name: "Edge Finishing / Safety Stitch",
        description: "Overlocks raw denim edges to prevent fraying and adds a safety stitch for seam strength.",
        machineIds: ["m12"],
        needleProductIds: ["n4"],
      },
      {
        name: "Pocket Setting",
        description: "Automatically creates and binds the back pocket opening in one programmed pass.",
        machineIds: ["m15"],
        needleProductIds: ["n5"],
      },
      {
        name: "Waistband & Belt Loop Attach",
        description: "Stitches the waistband and bartacks belt loops using a programmed pattern on a large-bed template machine.",
        machineIds: ["m14"],
        needleProductIds: ["n4"],
      },
      {
        name: "Rivets & Heavy Bartacking",
        description: "Reinforces stress points (pocket corners, belt loop ends) where rivets are placed, using a heavy leather-point needle.",
        machineIds: ["m14"],
        needleProductIds: ["n5"],
      },
    ],
  },
];

// Total units purchased per machine model — shared by the bulk purchase
// records below and the generated machine instances, so "units purchased"
// and "serial numbers available to pick from" always match up.
export const BULK_MACHINE_QTY: Record<string, number> = {
  m1: 35,
  m2: 30,
  m3: 28,
  m4: 25,
  m5: 40,
  m6: 20,
  m7: 18,
  m8: 32,
  m9: 22,
  m10: 15,
  m11: 26,
  m12: 24,
  m13: 19,
  m14: 33,
  m15: 33,
};

const handPickedInstances: MachineInstance[] = [
  {
    id: "mi1",
    serialNumber: "A6-001-2025",
    machineId: "m1",
    organizationId: "org1",
    location: "Line 1 - Left",
  },
  {
    id: "mi2",
    serialNumber: "A6-002-2025",
    machineId: "m1",
    organizationId: "org1",
    location: "Line 1 - Right",
  },
  {
    id: "mi3",
    serialNumber: "A6-003-2025",
    machineId: "m1",
    organizationId: "org1",
    location: "Line 2 - Center",
  },
  {
    id: "mi4",
    serialNumber: "M9A-010-2025",
    machineId: "m2",
    organizationId: "org1",
    location: "Template Room",
  },
  {
    id: "mi5",
    serialNumber: "M9A-011-2025",
    machineId: "m2",
    organizationId: "org1",
    location: "Sample Room",
  },
  {
    id: "mi6",
    serialNumber: "C5-100-2025",
    machineId: "m3",
    organizationId: "org2",
    location: "Finishing Line",
  },
  {
    id: "mi7",
    serialNumber: "K10-500-2025",
    machineId: "m4",
    organizationId: "org1",
    location: "Automation Bay",
  },
];

const INSTANCE_LOCATIONS = ["Line 1", "Line 2", "Line 3", "Finishing Line", "Sample Room", "Automation Bay"];

// Top every machine up to its purchased quantity with auto-generated serial
// numbers, so customers have a real list of their factory's own units to
// pick from when reporting an issue.
function generateExtraInstances(): MachineInstance[] {
  const extra: MachineInstance[] = [];

  for (const m of machines) {
    const target = BULK_MACHINE_QTY[m.id] ?? 0;
    const existingForMachine = handPickedInstances.filter((mi) => mi.machineId === m.id);
    const usedSerials = new Set(existingForMachine.map((mi) => mi.serialNumber));
    const modelSlug = m.model.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const needed = target - existingForMachine.length;

    let seq = 0;
    let created = 0;
    while (created < needed) {
      seq += 1;
      const serialNumber = `${modelSlug}-${String(seq).padStart(3, "0")}-2025`;
      if (usedSerials.has(serialNumber)) continue;
      extra.push({
        id: `mi-${m.id}-${seq}`,
        serialNumber,
        machineId: m.id,
        organizationId: m.organizationId,
        location: INSTANCE_LOCATIONS[seq % INSTANCE_LOCATIONS.length],
      });
      created += 1;
    }
  }

  return extra;
}

export const machineInstances: MachineInstance[] = [...handPickedInstances, ...generateExtraInstances()];

// Operators run machines on the floor but cannot raise tickets — only the
// factory's IE (Industrial Engineer) is authorized to report issues.
export const users: User[] = [
  {
    id: "u1",
    name: "Operator Rahim",
    organizationId: "org1",
    role: "OPERATOR",
    aiCredits: 100,
    phone: "+8801711000001",
  },
  {
    id: "u2",
    name: "Operator Karim",
    organizationId: "org1",
    role: "OPERATOR",
    aiCredits: 100,
    phone: "+8801711000002",
  },
  {
    id: "u3",
    name: "Operator Salma",
    organizationId: "org2",
    role: "OPERATOR",
    aiCredits: 100,
    phone: "+8801711000003",
  },
  {
    id: "u4",
    name: "Operator Jashim",
    organizationId: "org2",
    role: "OPERATOR",
    aiCredits: 100,
    phone: "+8801711000004",
  },
  {
    id: "u5",
    name: "Operator Nasrin",
    organizationId: "org3",
    role: "OPERATOR",
    aiCredits: 100,
    phone: "+8801711000005",
  },
  {
    id: "u6",
    name: "IE Hossain",
    organizationId: "org1",
    role: "IE",
    aiCredits: 100,
    phone: "+8801711000006",
  },
  {
    id: "u7",
    name: "IE Tania",
    organizationId: "org2",
    role: "IE",
    aiCredits: 100,
    phone: "+8801711000007",
  },
  {
    id: "u8",
    name: "IE Mahin",
    organizationId: "org3",
    role: "IE",
    aiCredits: 100,
    phone: "+8801711000008",
  },
];

// Raised by each factory's IE (Industrial Engineer) — operators are not
// permitted to create tickets, see POST /tickets in routes/tickets.ts.
const t1Base = Date.now() - 1000 * 60 * 60 * 24 * 2;
const t2Base = Date.now() - 1000 * 60 * 60 * 24;
const t3Base = Date.now() - 1000 * 60 * 60 * 5;
const t4Base = Date.now() - 1000 * 60 * 60 * 48;
const t5Base = Date.now() - 1000 * 60 * 30;

export const tickets: Ticket[] = [
  {
    id: "t-seed-1",
    machineId: "m1",
    createdByUserId: "u6",
    issueType: "THREAD_BREAKING",
    description: "Thread keeps snapping on the upper needle.",
    status: "OPEN",
    technicianNotes: [],
    events: [mkEvent("RAISED", "Issue raised by IE Hossain", "IE Hossain", t1Base)],
    createdAt: new Date(t1Base).toISOString(),
  },
  {
    id: "t-seed-2",
    machineId: "m2",
    createdByUserId: "u6",
    issueType: "STITCH_SKIPPING",
    description: "Skipping stitches on heavier denim fabric.",
    status: "IN_PROGRESS",
    technicianId: "tech1",
    technicianNotes: ["Checked needle size, swapping for heavier gauge."],
    events: [
      mkEvent("RAISED", "Issue raised by IE Hossain", "IE Hossain", t2Base),
      mkEvent("ASSIGNED", "Assigned to Rashed (Technician)", "Rashed (Technician)", t2Base + 5 * 60 * 1000),
      mkEvent("STATUS_CHANGED", "Status changed to IN_PROGRESS", "Rashed (Technician)", t2Base + 6 * 60 * 1000),
      mkEvent(
        "COMMENT",
        "Checked needle size, swapping for heavier gauge.",
        "Rashed (Technician)",
        t2Base + 10 * 60 * 1000
      ),
    ],
    createdAt: new Date(t2Base).toISOString(),
  },
  {
    id: "t-seed-3",
    machineId: "m1",
    createdByUserId: "u7",
    issueType: "FABRIC_NOT_FEEDING",
    description: "Feed dog not pulling fabric through evenly.",
    status: "OPEN",
    technicianNotes: [],
    events: [mkEvent("RAISED", "Issue raised by IE Tania", "IE Tania", t3Base)],
    createdAt: new Date(t3Base).toISOString(),
  },
  {
    id: "t-seed-4",
    machineId: "m2",
    createdByUserId: "u7",
    issueType: "THREAD_BREAKING",
    description: "Lower thread tension causing frequent breaks.",
    status: "COMPLETED",
    technicianId: "tech2",
    technicianNotes: ["Re-threaded and adjusted tension. Resolved."],
    events: [
      mkEvent("RAISED", "Issue raised by IE Tania", "IE Tania", t4Base),
      mkEvent("ASSIGNED", "Assigned to Nila (Technician)", "Nila (Technician)", t4Base + 5 * 60 * 1000),
      mkEvent("STATUS_CHANGED", "Status changed to IN_PROGRESS", "Nila (Technician)", t4Base + 6 * 60 * 1000),
      mkEvent(
        "COMMENT",
        "Re-threaded and adjusted tension. Resolved.",
        "Nila (Technician)",
        t4Base + 30 * 60 * 1000
      ),
      mkEvent("STATUS_CHANGED", "Status changed to COMPLETED", "Nila (Technician)", t4Base + 31 * 60 * 1000),
    ],
    createdAt: new Date(t4Base).toISOString(),
  },
  {
    id: "t-seed-5",
    machineId: "m1",
    createdByUserId: "u8",
    issueType: "STITCH_SKIPPING",
    description: "Intermittent skipped stitches since this morning.",
    status: "OPEN",
    technicianNotes: [],
    events: [mkEvent("RAISED", "Issue raised by IE Mahin", "IE Mahin", t5Base)],
    createdAt: new Date(t5Base).toISOString(),
  },
];

// 15 more varied tickets so the dashboards have ~20 issues to show.
const EXTRA_DESCRIPTIONS: Record<IssueType, string[]> = {
  THREAD_BREAKING: [
    "Top thread snapping every few stitches.",
    "Thread breaks whenever sewing thicker seams.",
    "Bottom thread breaking near the bobbin case.",
  ],
  STITCH_SKIPPING: [
    "Skipping stitches on stretch fabric.",
    "Random skipped stitches at high speed.",
    "Stitches skip when sewing corners.",
  ],
  FABRIC_NOT_FEEDING: [
    "Fabric bunching up instead of feeding smoothly.",
    "Feed dog seems stuck, fabric not moving.",
    "Uneven feeding causing puckered seams.",
  ],
};

const EXTRA_ISSUE_TYPES: IssueType[] = ["THREAD_BREAKING", "STITCH_SKIPPING", "FABRIC_NOT_FEEDING"];
const EXTRA_IES = [
  { id: "u6", name: "IE Hossain" },
  { id: "u7", name: "IE Tania" },
  { id: "u8", name: "IE Mahin" },
];
const EXTRA_TECHS = [
  { id: "tech1", name: "Rashed (Technician)" },
  { id: "tech2", name: "Nila (Technician)" },
];
const EXTRA_STATUSES: Ticket["status"][] = ["OPEN", "IN_PROGRESS", "COMPLETED"];

function buildExtraTicket(index: number): Ticket {
  const issueType = EXTRA_ISSUE_TYPES[index % EXTRA_ISSUE_TYPES.length];
  const ie = EXTRA_IES[index % EXTRA_IES.length];
  const status = EXTRA_STATUSES[index % EXTRA_STATUSES.length];
  const machine = machines[(index + 4) % machines.length];
  const description = EXTRA_DESCRIPTIONS[issueType][index % EXTRA_DESCRIPTIONS[issueType].length];

  const base = Date.now() - 1000 * 60 * 60 * (24 * (index + 3) + (index % 7));
  const events = [mkEvent("RAISED", `Issue raised by ${ie.name}`, ie.name, base)];
  const technicianNotes: string[] = [];
  let technicianId: string | undefined;

  if (status !== "OPEN") {
    const tech = EXTRA_TECHS[index % EXTRA_TECHS.length];
    technicianId = tech.id;
    events.push(mkEvent("ASSIGNED", `Assigned to ${tech.name}`, tech.name, base + 5 * 60 * 1000));
    events.push(mkEvent("STATUS_CHANGED", "Status changed to IN_PROGRESS", tech.name, base + 6 * 60 * 1000));
    const note = "Inspected and adjusted machine settings.";
    technicianNotes.push(note);
    events.push(mkEvent("COMMENT", note, tech.name, base + 20 * 60 * 1000));
    if (status === "COMPLETED") {
      events.push(mkEvent("STATUS_CHANGED", "Status changed to COMPLETED", tech.name, base + 40 * 60 * 1000));
    }
  }

  return {
    id: `t-seed-${index + 6}`,
    machineId: machine.id,
    createdByUserId: ie.id,
    issueType,
    description,
    status,
    technicianId,
    technicianNotes,
    events,
    createdAt: new Date(base).toISOString(),
  };
}

tickets.push(...Array.from({ length: 15 }, (_, i) => buildExtraTicket(i)));

const handPickedPurchases: Purchase[] = [
  {
    id: "p1",
    organizationId: "org1",
    itemType: "MACHINE",
    itemName: "Jack A4C",
    machineId: "m1",
    serialNumber: "A6-001-2025",
    quantity: 1,
    unitPrice: 250000,
    purchaseDate: "2024-01-10",
  },
  {
    id: "p2",
    organizationId: "org1",
    itemType: "MACHINE",
    itemName: "Jack A4C",
    machineId: "m1",
    serialNumber: "A6-002-2025",
    quantity: 1,
    unitPrice: 250000,
    purchaseDate: "2024-01-10",
  },
  {
    id: "p3",
    organizationId: "org1",
    itemType: "MACHINE",
    itemName: "Template Machine M9-A",
    machineId: "m2",
    serialNumber: "M9A-010-2025",
    quantity: 1,
    unitPrice: 180000,
    purchaseDate: "2024-03-05",
  },
  {
    id: "p4",
    organizationId: "org1",
    itemType: "NEEDLE",
    itemName: "DBx1 Round Point (Groz-Beckert)",
    needleProductId: "n1",
    machineId: "m1",
    serialNumber: "A6-001-2025",
    quantity: 100,
    unitPrice: 15,
    purchaseDate: "2025-06-01",
  },
  {
    id: "p5",
    organizationId: "org1",
    itemType: "SPARE_PART",
    itemName: "Bobbin Case",
    sparePartId: "sp1",
    machineId: "m1",
    serialNumber: "A6-002-2025",
    quantity: 5,
    unitPrice: 300,
    purchaseDate: "2025-08-12",
  },
  {
    id: "p6",
    organizationId: "org2",
    itemType: "MACHINE",
    itemName: "Jack C5 Overlock",
    machineId: "m3",
    serialNumber: "C5-100-2025",
    quantity: 1,
    unitPrice: 220000,
    purchaseDate: "2024-05-20",
  },
  {
    id: "p7",
    organizationId: "org2",
    itemType: "SPARE_PART",
    itemName: "Presser Foot",
    sparePartId: "sp2",
    machineId: "m3",
    serialNumber: "C5-100-2025",
    quantity: 3,
    unitPrice: 500,
    purchaseDate: "2025-09-02",
  },
  {
    id: "p8",
    organizationId: "org3",
    itemType: "NEEDLE",
    itemName: "DCx27 Light Ball Point (Groz-Beckert)",
    needleProductId: "n2",
    quantity: 200,
    unitPrice: 18,
    purchaseDate: "2025-11-15",
  },
  {
    id: "p9",
    organizationId: "org1",
    itemType: "MACHINE",
    itemName: "Interlock K10 Automated",
    machineId: "m4",
    serialNumber: "K10-500-2025",
    quantity: 1,
    unitPrice: 300000,
    purchaseDate: "2025-02-14",
  },
  {
    id: "p10",
    organizationId: "org1",
    itemType: "NEEDLE",
    itemName: "TQx7 Heavy Duty (Groz-Beckert)",
    needleProductId: "n4",
    machineId: "m4",
    serialNumber: "K10-500-2025",
    quantity: 50,
    unitPrice: 22,
    purchaseDate: "2025-09-20",
  },
];

// Bulk machine purchases across all 15 models — roughly 400 units total
// purchased over time, so factories look like established customers.
// Quantities reuse BULK_MACHINE_QTY (defined above, near machineInstances)
// so "units purchased" always matches "serial numbers available".
const bulkMachinePurchases: Purchase[] = machines.map((m, idx): Purchase => ({
  id: `p-bulk-${m.id}`,
  organizationId: m.organizationId,
  itemType: "MACHINE",
  itemName: m.name,
  machineId: m.id,
  quantity: BULK_MACHINE_QTY[m.id] ?? 20,
  unitPrice: 150000 + (idx % 6) * 18000,
  purchaseDate: new Date(Date.now() - (idx + 2) * 1000 * 60 * 60 * 24 * 45).toISOString().slice(0, 10),
}));

export const purchases: Purchase[] = [...handPickedPurchases, ...bulkMachinePurchases];

export const reorderRequests: ReorderRequest[] = [
  {
    id: "r-seed-1",
    organizationId: "org2",
    requestedByUserId: "u7",
    itemType: "NEEDLE",
    itemName: "DCx27 Light Ball Point (Groz-Beckert)",
    needleProductId: "n2",
    quantity: 200,
    status: "PENDING",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
];

let taskEventCounter = 0;
function mkTaskEvent(
  type: InternalTask["events"][number]["type"],
  description: string,
  authorAccountId: string,
  authorName: string,
  at: number
) {
  taskEventCounter += 1;
  return { id: `tev-seed-${taskEventCounter}`, type, description, authorAccountId, authorName, createdAt: new Date(at).toISOString() };
}

let taskCommentCounter = 0;
function mkTaskComment(authorAccountId: string, authorName: string, text: string, at: number) {
  taskCommentCounter += 1;
  return { id: `tcm-seed-${taskCommentCounter}`, authorAccountId, authorName, text, createdAt: new Date(at).toISOString() };
}

// Internal team Kanban task board. Seed-only shape: a plain `assigneeId`
// here becomes that task's LEAD TaskAssignment row (see prisma/seed.ts) —
// simpler than writing out the live multi-assignee shape by hand for fixtures.
export const internalTasks: (Omit<InternalTask, "assignees"> & { assigneeId?: string | null })[] = [
  {
    id: "task-1",
    title: "Stock check: Groz-Beckert needle inventory",
    description: "Audit warehouse stock levels for all 5 needle systems before next reorder cycle.",
    column: "BACKLOG",
    priority: "MEDIUM",
    assigneeId: null,
    createdByAccountId: "mgr1",
    events: [mkTaskEvent("CREATED", "Task created", "mgr1", "Faisal (Manager)", Date.now() - 1000 * 60 * 60 * 24 * 6)],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
  },
  {
    id: "task-2",
    title: "Train new technician on A60 computerized panel",
    description: "Walk through the touchscreen settings menu and common error codes.",
    column: "BACKLOG",
    priority: "LOW",
    assigneeId: "tech2",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10),
    createdByAccountId: "mgr1",
    events: [
      mkTaskEvent("CREATED", "Task created", "mgr1", "Faisal (Manager)", Date.now() - 1000 * 60 * 60 * 24 * 5),
      mkTaskEvent("ASSIGNED", "Assigned to Nila (Technician)", "mgr1", "Faisal (Manager)", Date.now() - 1000 * 60 * 60 * 24 * 5),
    ],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: "task-3",
    title: "Respond to Dhaka Apparel Factory thread breaking ticket",
    description: "Customer reports thread snapping on the upper needle. Needs a site visit.",
    column: "PENDING",
    priority: "HIGH",
    assigneeId: "tech1",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 10),
    createdByAccountId: "mgr1",
    relatedTicketId: "t-seed-1",
    events: [
      mkTaskEvent("CREATED", "Task created", "mgr1", "Faisal (Manager)", Date.now() - 1000 * 60 * 60 * 24 * 2),
      mkTaskEvent("ASSIGNED", "Assigned to Rashed (Technician)", "mgr1", "Faisal (Manager)", Date.now() - 1000 * 60 * 60 * 24 * 2),
    ],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: "task-4",
    title: "Confirm pending needle reorder for Chittagong",
    description: "Chittagong Garments Ltd requested 200x DCx27 needles — confirm supplier lead time.",
    column: "PENDING",
    priority: "MEDIUM",
    assigneeId: null,
    createdByAccountId: "mgr1",
    events: [mkTaskEvent("CREATED", "Task created", "mgr1", "Faisal (Manager)", Date.now() - 1000 * 60 * 60 * 20)],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
  {
    id: "task-5",
    title: "Repair stitch skipping on M9-A template machine",
    description: "Heavier denim causing skipped stitches — swapping to a heavier gauge needle.",
    column: "IN_PROGRESS",
    priority: "URGENT",
    assigneeId: "tech1",
    // overdue on purpose, to demo the overdue badge
    dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().slice(0, 10),
    createdByAccountId: "mgr1",
    relatedTicketId: "t-seed-2",
    events: [
      mkTaskEvent("CREATED", "Task created", "mgr1", "Faisal (Manager)", Date.now() - 1000 * 60 * 60 * 24),
      mkTaskEvent("ASSIGNED", "Assigned to Rashed (Technician)", "mgr1", "Faisal (Manager)", Date.now() - 1000 * 60 * 60 * 24),
      mkTaskEvent("MOVED", "Moved from Pending to In Progress", "tech1", "Rashed (Technician)", Date.now() - 1000 * 60 * 60 * 3),
    ],
    comments: [
      mkTaskComment(
        "tech1",
        "Rashed (Technician)",
        "Swapped to a heavier gauge needle, testing now on a scrap denim panel.",
        Date.now() - 1000 * 60 * 60 * 2
      ),
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "task-6",
    title: "Investigate recurring overlock thread tension complaints",
    description: "Multiple factories reporting tension drift on the C-series overlock machines.",
    column: "IN_PROGRESS",
    priority: "HIGH",
    assigneeId: "tech2",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().slice(0, 10),
    createdByAccountId: "mgr1",
    events: [
      mkTaskEvent("CREATED", "Task created", "mgr1", "Faisal (Manager)", Date.now() - 1000 * 60 * 60 * 18),
      mkTaskEvent("ASSIGNED", "Assigned to Nila (Technician)", "mgr1", "Faisal (Manager)", Date.now() - 1000 * 60 * 60 * 18),
      mkTaskEvent("MOVED", "Moved from Pending to In Progress", "tech2", "Nila (Technician)", Date.now() - 1000 * 60 * 60 * 1),
    ],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
  },
  {
    id: "task-7",
    title: "Resolved lower thread tension issue at Chittagong",
    description: "Re-threaded and adjusted tension on-site. Customer confirmed fix.",
    column: "COMPLETED",
    priority: "HIGH",
    assigneeId: "tech2",
    createdByAccountId: "mgr1",
    relatedTicketId: "t-seed-4",
    events: [
      mkTaskEvent("CREATED", "Task created", "mgr1", "Faisal (Manager)", Date.now() - 1000 * 60 * 60 * 48),
      mkTaskEvent("ASSIGNED", "Assigned to Nila (Technician)", "mgr1", "Faisal (Manager)", Date.now() - 1000 * 60 * 60 * 48),
      mkTaskEvent("MOVED", "Moved from In Progress to Completed", "tech2", "Nila (Technician)", Date.now() - 1000 * 60 * 60 * 47),
    ],
    comments: [
      mkTaskComment("tech2", "Nila (Technician)", "Done — customer confirmed the fix on a follow-up call.", Date.now() - 1000 * 60 * 60 * 47),
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 47).toISOString(),
  },
  {
    id: "task-8",
    title: "Replaced rotary hook on Jack A4C unit",
    description: "Routine wear replacement during scheduled maintenance visit.",
    column: "COMPLETED",
    priority: "MEDIUM",
    assigneeId: "tech1",
    createdByAccountId: "mgr1",
    events: [mkTaskEvent("CREATED", "Task created", "mgr1", "Faisal (Manager)", Date.now() - 1000 * 60 * 60 * 72)],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 70).toISOString(),
  },
];

// In-app alerts shown to managers/admins when a technician moves a task.
export const internalNotifications: InternalNotification[] = [
  {
    id: "inot-seed-1",
    message: 'Rashed (Technician) moved "Repair stitch skipping on M9-A template machine" to In Progress',
    taskId: "task-5",
    triggeredByAccountId: "tech1",
    triggeredByName: "Rashed (Technician)",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
];

export const cache: CachedAnswer[] = [];

// Simulated SMS/WhatsApp notifications — see services/notificationService.ts.
// Populated at runtime; starts empty.
export const notificationLog: NotificationLogEntry[] = [];
