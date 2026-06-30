import { useEffect, useState } from "react";
import { AlertTriangle, TrendingDown } from "lucide-react";
import { fetchAnalyticsGroup } from "../api";
import type { CustomerUser } from "../types";

type FactoryRow = {
  id: string; name: string; location: string | null;
  openTickets: number; inProgressTickets: number; totalTickets: number;
  thisMonthDowntimeHours: number;
  fleet: { total: number; ok: number; due_soon: number; overdue: number; unscheduled: number };
  needleSpendThisMonth: number;
};

function FleetBar({ fleet }: { fleet: FactoryRow["fleet"] }) {
  const total = fleet.total || 1;
  return (
    <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", minWidth: 80 }}>
      <div style={{ width: `${(fleet.ok / total) * 100}%`, background: "#16a34a" }} title={`OK: ${fleet.ok}`} />
      <div style={{ width: `${(fleet.due_soon / total) * 100}%`, background: "#d97706" }} title={`Due soon: ${fleet.due_soon}`} />
      <div style={{ width: `${(fleet.overdue / total) * 100}%`, background: "#dc2626" }} title={`Overdue: ${fleet.overdue}`} />
      <div style={{ width: `${(fleet.unscheduled / total) * 100}%`, background: "#6b7280" }} title={`Unscheduled: ${fleet.unscheduled}`} />
    </div>
  );
}

function StatusDot({ color }: { color: string }) {
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, marginRight: 4 }} />;
}

export default function GroupDashboardPage({ user }: { user: CustomerUser }) {
  const [data, setData] = useState<{ groupId: string; factories: FactoryRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user.groupId) return;
    fetchAnalyticsGroup(user.groupId)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [user.groupId]);

  if (!user.groupId) {
    return (
      <div className="cust-card" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🏭</div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Multi-factory view not enabled</div>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          Your account is not linked to a factory group. Contact FM Corporation to link multiple factories under one group.
        </div>
      </div>
    );
  }

  if (error) return <div className="cust-error">{error}</div>;
  if (!data) return <p className="cust-empty">Loading group data…</p>;

  const factories = data.factories;
  const totalMachines = factories.reduce((s, f) => s + f.fleet.total, 0);
  const totalOpen = factories.reduce((s, f) => s + f.openTickets, 0);
  const totalDowntime = factories.reduce((s, f) => s + f.thisMonthDowntimeHours, 0);
  const totalNeedleSpend = factories.reduce((s, f) => s + f.needleSpendThisMonth, 0);

  const worstDowntime = [...factories].sort((a, b) => b.thisMonthDowntimeHours - a.thisMonthDowntimeHours)[0];
  const mostAlerts = [...factories].sort((a, b) => b.openTickets - a.openTickets)[0];

  return (
    <div>
      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
        <div className="cust-card">
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Factories</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{factories.length}</div>
        </div>
        <div className="cust-card">
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Total machines</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{totalMachines}</div>
        </div>
        <div className="cust-card">
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Open tickets</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: totalOpen > 0 ? "#d97706" : "#16a34a" }}>{totalOpen}</div>
        </div>
        <div className="cust-card">
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Downtime this month</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#dc2626" }}>{totalDowntime.toFixed(1)}h</div>
        </div>
        <div className="cust-card">
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Needle spend (month)</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>৳{totalNeedleSpend.toLocaleString()}</div>
        </div>
      </div>

      {/* Alerts */}
      {(worstDowntime && worstDowntime.thisMonthDowntimeHours > 0) && (
        <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <TrendingDown size={16} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13 }}>
            <strong>{worstDowntime.name}</strong> has the most downtime this month: <strong>{worstDowntime.thisMonthDowntimeHours.toFixed(1)}h</strong>.
            {mostAlerts && mostAlerts.id !== worstDowntime.id && mostAlerts.openTickets > 0 && (
              <> <strong>{mostAlerts.name}</strong> has {mostAlerts.openTickets} open ticket{mostAlerts.openTickets > 1 ? "s" : ""}.</>
            )}
          </div>
        </div>
      )}

      {/* Factory comparison table */}
      <div className="cust-card">
        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700 }}>Factory comparison</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="cust-table">
            <thead>
              <tr>
                <th>Factory</th>
                <th>Location</th>
                <th>Fleet health</th>
                <th>Machines</th>
                <th>Open tickets</th>
                <th>Downtime (month)</th>
                <th>Needle spend (month)</th>
              </tr>
            </thead>
            <tbody>
              {factories.map((f) => {
                const healthPct = f.fleet.total > 0 ? Math.round((f.fleet.ok / f.fleet.total) * 100) : 0;
                return (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600 }}>{f.name}</td>
                    <td style={{ color: "#9ca3af", fontSize: 12 }}>{f.location ?? "—"}</td>
                    <td style={{ minWidth: 120 }}>
                      <div style={{ marginBottom: 4 }}>
                        <FleetBar fleet={f.fleet} />
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>
                        <StatusDot color="#16a34a" />{f.fleet.ok} ok
                        {f.fleet.due_soon > 0 && <><StatusDot color="#d97706" style={{ marginLeft: 4 }} />{f.fleet.due_soon} due</>}
                        {f.fleet.overdue > 0 && <><StatusDot color="#dc2626" />{f.fleet.overdue} overdue</>}
                      </div>
                    </td>
                    <td>{f.fleet.total}</td>
                    <td>
                      <span style={{ color: f.openTickets > 0 ? "#d97706" : "#16a34a", fontWeight: 600 }}>
                        {f.openTickets}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: f.thisMonthDowntimeHours > 0 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>
                        {f.thisMonthDowntimeHours.toFixed(1)}h
                      </span>
                    </td>
                    <td>৳{f.needleSpendThisMonth.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Fleet legend */}
        <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11, color: "#9ca3af", flexWrap: "wrap" }}>
          <span><StatusDot color="#16a34a" />OK</span>
          <span><StatusDot color="#d97706" />Due soon</span>
          <span><StatusDot color="#dc2626" />Overdue</span>
          <span><StatusDot color="#6b7280" />Unscheduled</span>
        </div>
      </div>
    </div>
  );
}
