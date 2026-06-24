import { Fragment, useEffect, useState } from "react";
import { fetchCustomerTickets } from "../api";
import type { CustomerTicket, CustomerUser } from "../types";
import { useLang } from "./i18n";
import TicketTimeline from "./TicketTimeline";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#d97706",
  IN_PROGRESS: "#2563eb",
  COMPLETED: "#16a34a",
};

export default function TicketHistoryPage({ user }: { user: CustomerUser }) {
  const { t } = useLang();
  const [tickets, setTickets] = useState<CustomerTicket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomerTickets(user.id)
      .then(setTickets)
      .catch((err) => setError(err.message));
  }, [user.id]);

  function handleUpdated(updated: CustomerTicket) {
    setTickets((prev) => prev?.map((t) => (t.id === updated.id ? updated : t)) ?? prev);
  }

  if (error) return <div className="cust-error">{error}</div>;
  if (!tickets) return <p className="cust-empty">{t("tickets.loading")}</p>;
  if (tickets.length === 0) return <p className="cust-empty">{t("tickets.none")}</p>;

  const sorted = tickets.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="cust-card">
      <table className="cust-table">
        <thead>
          <tr>
            <th>{t("table.issueType")}</th>
            <th>{t("table.description")}</th>
            <th>{t("table.status")}</th>
            <th>{t("table.raisedAt")}</th>
            <th>{t("table.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((tk) => (
            <Fragment key={tk.id}>
              <tr>
                <td>{tk.issueType.replaceAll("_", " ")}</td>
                <td>{tk.description}</td>
                <td>
                  <span className="cust-status-badge" style={{ backgroundColor: STATUS_COLORS[tk.status] }}>
                    {tk.status.replaceAll("_", " ")}
                  </span>
                </td>
                <td>{new Date(tk.createdAt).toLocaleString()}</td>
                <td>
                  <button
                    className="cust-button-secondary"
                    onClick={() => setExpandedId(expandedId === tk.id ? null : tk.id)}
                  >
                    {expandedId === tk.id ? t("tickets.hideDetails") : t("tickets.viewDetails")}
                  </button>
                </td>
              </tr>
              {expandedId === tk.id && (
                <tr>
                  <td colSpan={5}>
                    <TicketTimeline ticket={tk} user={user} onUpdated={handleUpdated} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
