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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  // Date range applied client-side, same reasoning as Purchase History — a
  // single factory's ticket volume is small enough not to need a dedicated
  // server-side date filter endpoint.
  const from = dateFrom ? new Date(dateFrom) : null;
  const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
  const filtered = sorted.filter((tk) => {
    const d = new Date(tk.createdAt);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
  const dateFiltered = Boolean(dateFrom || dateTo);

  return (
    <div>
      <div className="cust-card cust-form" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ flex: 1, minWidth: 140, marginBottom: 0 }}>
            {t("tickets.dateFrom")}
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} max={dateTo || undefined} />
          </label>
          <label style={{ flex: 1, minWidth: 140, marginBottom: 0 }}>
            {t("tickets.dateTo")}
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} min={dateFrom || undefined} />
          </label>
          {dateFiltered && (
            <button
              type="button"
              className="cust-button-secondary"
              onClick={() => { setDateFrom(""); setDateTo(""); }}
            >
              {t("tickets.clearDates")}
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="cust-empty">{t("tickets.noneInRange")}</p>
      ) : (
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
          {filtered.map((tk) => (
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
      )}
    </div>
  );
}
