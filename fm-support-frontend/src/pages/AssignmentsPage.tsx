import { useEffect, useState } from "react";
import { fetchAssignments, UnauthorizedError } from "../api";
import type { AssignmentsResponse, AssignmentTicket } from "../types";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#d97706",
  IN_PROGRESS: "#2563eb",
  COMPLETED: "#16a34a",
};

export default function AssignmentsPage({
  token,
  onUnauthorized,
}: {
  token: string;
  onUnauthorized: () => void;
}) {
  const [data, setData] = useState<AssignmentsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignments(token)
      .then(setData)
      .catch((err) => {
        if (err instanceof UnauthorizedError) return onUnauthorized();
        setError(err.message);
      });
  }, [token, onUnauthorized]);

  if (error) return <div className="page-error">Failed to load assignments: {error}</div>;
  if (!data) return <div className="page-loading">Loading assignments...</div>;

  return (
    <div className="assignments">
      {data.assignments.map((assignment) => (
        <div className="assignment-card" key={assignment.technicianId}>
          <div className="assignment-header">
            <h2>{assignment.technicianName}</h2>
            <span>{assignment.ticketCount} assigned</span>
          </div>
          {assignment.tickets.length === 0 ? (
            <p className="empty">No tickets assigned.</p>
          ) : (
            <TicketTable tickets={assignment.tickets} />
          )}
        </div>
      ))}

      <div className="assignment-card unassigned-card">
        <div className="assignment-header">
          <h2>Unassigned</h2>
          <span>{data.unassigned.ticketCount} waiting</span>
        </div>
        {data.unassigned.tickets.length === 0 ? (
          <p className="empty">Nothing unassigned.</p>
        ) : (
          <TicketTable tickets={data.unassigned.tickets} />
        )}
      </div>
    </div>
  );
}

function TicketTable({ tickets }: { tickets: AssignmentTicket[] }) {
  return (
    <table className="ticket-table">
      <thead>
        <tr>
          <th>Factory</th>
          <th>Worker</th>
          <th>Issue Type</th>
          <th>Description</th>
          <th>Machine</th>
          <th>Status</th>
          <th>Raised At</th>
        </tr>
      </thead>
      <tbody>
        {tickets.map((ticket) => (
          <tr key={ticket.ticketId}>
            <td>{ticket.factoryName}</td>
            <td>{ticket.workerName}</td>
            <td>{ticket.issueType.replaceAll("_", " ")}</td>
            <td>{ticket.description}</td>
            <td>{ticket.machineName}</td>
            <td>
              <span className="status-badge" style={{ backgroundColor: STATUS_COLORS[ticket.status] }}>
                {ticket.status.replaceAll("_", " ")}
              </span>
            </td>
            <td>{new Date(ticket.createdAt).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
