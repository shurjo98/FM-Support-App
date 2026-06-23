// src/routes/dashboard.ts
import { Router } from "express";
import { organizations, users, tickets, machines, internalAccounts } from "../store";
import { requireInternalAuth } from "../middleware/requireInternalAuth";

const router = Router();

// TEMP: login is disabled while we're testing the apps end-to-end.
// Flip back to true to require internal login before launch.
const REQUIRE_LOGIN = false;
if (REQUIRE_LOGIN) router.use(requireInternalAuth);

function technicianName(technicianId?: string | null): string | null {
  if (!technicianId) return null;
  return internalAccounts.find((a) => a.id === technicianId)?.name ?? technicianId;
}

// GET /dashboard -> tickets grouped by factory (organization) and worker (user)
router.get("/", (req, res) => {
  const factories = organizations.map((org) => {
    const orgUsers = users.filter((u) => u.organizationId === org.id);

    const workers = orgUsers.map((user) => {
      const userTickets = tickets
        .filter((t) => t.createdByUserId === user.id)
        .map((t) => ({
          id: t.id,
          issueType: t.issueType,
          description: t.description,
          status: t.status,
          machineName: machines.find((m) => m.id === t.machineId)?.name ?? t.machineId,
          assignedTo: technicianName(t.technicianId),
          createdAt: t.createdAt,
        }));

      return {
        id: user.id,
        name: user.name,
        ticketCount: userTickets.length,
        tickets: userTickets,
      };
    });

    const orgTickets = workers.flatMap((w) => w.tickets);

    return {
      id: org.id,
      name: org.name,
      location: org.location,
      workerCount: workers.length,
      ticketCount: orgTickets.length,
      openCount: orgTickets.filter((t) => t.status === "OPEN").length,
      inProgressCount: orgTickets.filter((t) => t.status === "IN_PROGRESS").length,
      completedCount: orgTickets.filter((t) => t.status === "COMPLETED").length,
      workers,
    };
  });

  res.json({
    totals: {
      factoryCount: factories.length,
      workerCount: users.length,
      ticketCount: tickets.length,
    },
    factories,
  });
});

// GET /dashboard/tickets -> flat list for table views, optionally filtered
// by ?factoryId=&workerId=&status=
router.get("/tickets", (req, res) => {
  const { factoryId, workerId, status } = req.query as {
    factoryId?: string;
    workerId?: string;
    status?: string;
  };

  const rows = tickets
    .filter((t) => {
      const user = users.find((u) => u.id === t.createdByUserId);
      if (factoryId && user?.organizationId !== factoryId) return false;
      if (workerId && t.createdByUserId !== workerId) return false;
      if (status && t.status !== status) return false;
      return true;
    })
    .map((t) => {
      const user = users.find((u) => u.id === t.createdByUserId);
      const org = organizations.find((o) => o.id === user?.organizationId);
      return {
        ticketId: t.id,
        factoryId: org?.id,
        factoryName: org?.name ?? "Unknown factory",
        workerId: user?.id,
        workerName: user?.name ?? "Unknown worker",
        machineName: machines.find((m) => m.id === t.machineId)?.name ?? t.machineId,
        issueType: t.issueType,
        description: t.description,
        status: t.status,
        assignedTo: technicianName(t.technicianId),
        createdAt: t.createdAt,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(rows);
});

// GET /dashboard/assignments -> tickets grouped by the technician they're
// assigned to, so the internal team can see who's working on what.
router.get("/assignments", (req, res) => {
  function ticketRow(t: (typeof tickets)[number]) {
    const user = users.find((u) => u.id === t.createdByUserId);
    const org = organizations.find((o) => o.id === user?.organizationId);
    return {
      ticketId: t.id,
      factoryName: org?.name ?? "Unknown factory",
      workerName: user?.name ?? "Unknown worker",
      machineName: machines.find((m) => m.id === t.machineId)?.name ?? t.machineId,
      issueType: t.issueType,
      description: t.description,
      status: t.status,
      createdAt: t.createdAt,
    };
  }

  const assignments = internalAccounts.map((account) => {
    const assignedTickets = tickets.filter((t) => t.technicianId === account.id).map(ticketRow);

    return {
      technicianId: account.id,
      technicianName: account.name,
      ticketCount: assignedTickets.length,
      tickets: assignedTickets,
    };
  });

  const unassigned = tickets.filter((t) => !t.technicianId).map(ticketRow);

  res.json({
    assignments,
    unassigned: {
      ticketCount: unassigned.length,
      tickets: unassigned,
    },
  });
});

export default router;
