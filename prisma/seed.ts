// Seeds the Postgres database from the same fixture data that used to live
// directly in src/store.ts's in-memory arrays. store.ts now only exports
// that fixture data; the live app reads/writes Postgres via Prisma.
import { PrismaClient } from "@prisma/client";
import {
  organizations,
  machines,
  needleProducts,
  spareParts,
  machineInstances,
  users,
  internalAccounts,
  tickets,
  purchases,
  reorderRequests,
  garmentRecommendations,
  internalTasks,
  internalNotifications,
} from "../src/store";

const prisma = new PrismaClient();

async function main() {
  await prisma.organization.createMany({
    data: organizations.map((o) => ({ id: o.id, name: o.name, location: o.location })),
  });

  await prisma.machine.createMany({
    data: machines.map((m) => ({
      id: m.id,
      name: m.name,
      model: m.model,
      organizationId: m.organizationId,
      productLine: m.productLine,
      category: m.category,
      imageUrl: m.imageUrl,
      images: m.images ?? [],
      description: m.description,
    })),
  });

  await prisma.needleProduct.createMany({
    data: needleProducts.map((n) => ({
      id: n.id,
      name: n.name,
      system: n.system,
      brand: n.brand,
      imageUrl: n.imageUrl,
      description: n.description,
    })),
  });

  await prisma.sparePart.createMany({
    data: spareParts.map((s) => ({
      id: s.id,
      name: s.name,
      compatibleWith: s.compatibleWith,
      imageUrl: s.imageUrl,
      description: s.description,
    })),
  });

  await prisma.machineInstance.createMany({
    data: machineInstances.map((mi) => ({
      id: mi.id,
      serialNumber: mi.serialNumber,
      machineId: mi.machineId,
      organizationId: mi.organizationId,
      location: mi.location,
    })),
  });

  await prisma.user.createMany({
    data: users.map((u) => ({
      id: u.id,
      name: u.name,
      organizationId: u.organizationId,
      role: u.role,
      aiCredits: u.aiCredits,
      phone: u.phone,
    })),
  });

  await prisma.internalAccount.createMany({
    data: internalAccounts.map((a) => ({
      id: a.id,
      accountId: a.accountId,
      password: a.password,
      name: a.name,
      role: a.role,
    })),
  });

  for (const t of tickets) {
    await prisma.ticket.create({
      data: {
        id: t.id,
        machineId: t.machineId,
        serialNumber: t.serialNumber,
        createdByUserId: t.createdByUserId,
        issueType: t.issueType,
        description: t.description,
        aiSuggestionText: t.aiSuggestion?.text,
        aiSuggestionFromCache: t.aiSuggestion?.fromCache,
        aiSuggestionCreditsUsed: t.aiSuggestion?.creditsUsed,
        status: t.status,
        technicianId: t.technicianId,
        technicianNotes: t.technicianNotes ?? [],
        createdAt: new Date(t.createdAt),
        events: {
          create: t.events.map((e) => ({
            id: e.id,
            type: e.type,
            description: e.description,
            authorName: e.authorName,
            createdAt: new Date(e.createdAt),
          })),
        },
        attachments: t.attachments
          ? {
              create: t.attachments.map((a) => ({
                id: a.id,
                kind: a.kind,
                url: a.url,
                uploadedAt: new Date(a.uploadedAt),
              })),
            }
          : undefined,
      },
    });
  }

  await prisma.purchase.createMany({
    data: purchases.map((p) => ({
      id: p.id,
      organizationId: p.organizationId,
      itemType: p.itemType,
      itemName: p.itemName,
      machineId: p.machineId,
      needleProductId: p.needleProductId,
      sparePartId: p.sparePartId,
      serialNumber: p.serialNumber,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      purchaseDate: p.purchaseDate,
    })),
  });

  await prisma.reorderRequest.createMany({
    data: reorderRequests.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      requestedByUserId: r.requestedByUserId,
      itemType: r.itemType,
      itemName: r.itemName,
      needleProductId: r.needleProductId,
      sparePartId: r.sparePartId,
      machineId: r.machineId,
      serialNumber: r.serialNumber,
      quantity: r.quantity,
      status: r.status,
      createdAt: new Date(r.createdAt),
    })),
  });

  for (const g of garmentRecommendations) {
    await prisma.garmentRecommendation.create({
      data: {
        id: g.garment,
        garment: g.garment,
        name: g.name,
        description: g.description,
        machineIds: g.machineIds,
        needleProductIds: g.needleProductIds,
        processes: g.processes
          ? {
              create: g.processes.map((p, idx) => ({
                id: `${g.garment}-proc-${idx}`,
                order: idx,
                name: p.name,
                description: p.description,
                machineIds: p.machineIds,
                needleProductIds: p.needleProductIds,
              })),
            }
          : undefined,
      },
    });
  }

  for (const task of internalTasks) {
    await prisma.internalTask.create({
      data: {
        id: task.id,
        title: task.title,
        description: task.description,
        column: task.column,
        priority: task.priority,
        ...(task.assigneeId
          ? { assignments: { create: [{ id: `ta-seed-${task.id}`, accountId: task.assigneeId, role: "LEAD" }] } }
          : {}),
        dueDate: task.dueDate,
        createdByAccountId: task.createdByAccountId,
        relatedTicketId: task.relatedTicketId,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        events: {
          create: task.events.map((e) => ({
            id: e.id,
            type: e.type,
            description: e.description,
            authorAccountId: e.authorAccountId,
            authorName: e.authorName,
            createdAt: new Date(e.createdAt),
          })),
        },
        comments: {
          create: task.comments.map((c) => ({
            id: c.id,
            authorAccountId: c.authorAccountId,
            authorName: c.authorName,
            text: c.text,
            createdAt: new Date(c.createdAt),
          })),
        },
      },
    });
  }

  await prisma.internalNotification.createMany({
    data: internalNotifications.map((n) => ({
      id: n.id,
      message: n.message,
      taskId: n.taskId,
      triggeredByAccountId: n.triggeredByAccountId,
      triggeredByName: n.triggeredByName,
      read: n.read,
      createdAt: new Date(n.createdAt),
    })),
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
