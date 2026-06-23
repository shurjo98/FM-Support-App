import { useEffect, useState } from "react";
import { fetchDashboard, UnauthorizedError } from "../api";
import type { DashboardResponse } from "../types";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#d97706",
  IN_PROGRESS: "#2563eb",
  COMPLETED: "#16a34a",
};

export default function DashboardPage({
  token,
  onUnauthorized,
}: {
  token: string;
  onUnauthorized: () => void;
}) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchDashboard(token)
      .then(setData)
      .catch((err) => {
        if (err instanceof UnauthorizedError) return onUnauthorized();
        setError(err.message);
      });
  }, [token, onUnauthorized]);

  function toggle(factoryId: string) {
    setExpanded((prev) => ({ ...prev, [factoryId]: !prev[factoryId] }));
  }

  if (error) return <div className="page-error">Failed to load dashboard: {error}</div>;
  if (!data) return <div className="page-loading">Loading dashboard...</div>;

  return (
    <div className="dashboard">
      <h1>Internal Team Dashboard</h1>
      <p className="subtitle">Issues raised by workers, grouped by factory</p>

      <div className="summary-cards">
        <SummaryCard label="Factories" value={data.totals.factoryCount} />
        <SummaryCard label="Workers" value={data.totals.workerCount} />
        <SummaryCard label="Total Issues Raised" value={data.totals.ticketCount} />
      </div>

      <div className="factories">
        {data.factories.map((factory) => (
          <div className="factory-card" key={factory.id}>
            <button className="factory-header" onClick={() => toggle(factory.id)}>
              <div>
                <h2>{factory.name}</h2>
                {factory.location && <span className="location">{factory.location}</span>}
              </div>
              <div className="factory-stats">
                <span>{factory.workerCount} workers</span>
                <span>{factory.ticketCount} issues</span>
                <span className="chevron">{expanded[factory.id] ? "▾" : "▸"}</span>
              </div>
            </button>

            {expanded[factory.id] && (
              <div className="workers">
                {factory.workers.length === 0 && <p className="empty">No workers in this factory yet.</p>}
                {factory.workers.map((worker) => (
                  <div className="worker-row" key={worker.id}>
                    <div className="worker-name">
                      {worker.name} <span className="ticket-count">({worker.ticketCount} issues)</span>
                    </div>
                    {worker.tickets.length > 0 && (
                      <table className="ticket-table">
                        <thead>
                          <tr>
                            <th>Issue Type</th>
                            <th>Description</th>
                            <th>Machine</th>
                            <th>Status</th>
                            <th>Assigned To</th>
                            <th>Raised At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {worker.tickets.map((ticket) => (
                            <tr key={ticket.id}>
                              <td>{ticket.issueType.replaceAll("_", " ")}</td>
                              <td>{ticket.description}</td>
                              <td>{ticket.machineName}</td>
                              <td>
                                <span
                                  className="status-badge"
                                  style={{ backgroundColor: STATUS_COLORS[ticket.status] }}
                                >
                                  {ticket.status.replaceAll("_", " ")}
                                </span>
                              </td>
                              <td>{ticket.assignedTo ?? "—"}</td>
                              <td>{new Date(ticket.createdAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="summary-card">
      <div className="summary-value">{value}</div>
      <div className="summary-label">{label}</div>
    </div>
  );
}
