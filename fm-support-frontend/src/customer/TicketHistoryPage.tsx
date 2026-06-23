import { useEffect, useState } from "react";
import { fetchCustomerTickets } from "../api";
import type { CustomerTicket, CustomerUser } from "../types";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#d97706",
  IN_PROGRESS: "#2563eb",
  COMPLETED: "#16a34a",
};

export default function TicketHistoryPage({ user }: { user: CustomerUser }) {
  const [tickets, setTickets] = useState<CustomerTicket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomerTickets(user.id)
      .then(setTickets)
      .catch((err) => setError(err.message));
  }, [user.id]);

  if (error) return <div className="cust-error">{error}</div>;
  if (!tickets) return <p className="cust-empty">Loading ticket history...</p>;
  if (tickets.length === 0) return <p className="cust-empty">No issues raised yet.</p>;

  return (
    <div className="cust-card">
      <table className="cust-table">
        <thead>
          <tr>
            <th>Issue Type</th>
            <th>Description</th>
            <th>AI Suggestion</th>
            <th>Status</th>
            <th>Raised At</th>
          </tr>
        </thead>
        <tbody>
          {tickets
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((t) => (
              <tr key={t.id}>
                <td>{t.issueType.replaceAll("_", " ")}</td>
                <td>{t.description}</td>
                <td style={{ maxWidth: 280, whiteSpace: "pre-wrap" }}>{t.aiSuggestion?.text ?? "—"}</td>
                <td>
                  <span className="cust-status-badge" style={{ backgroundColor: STATUS_COLORS[t.status] }}>
                    {t.status.replaceAll("_", " ")}
                  </span>
                </td>
                <td>{new Date(t.createdAt).toLocaleString()}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
