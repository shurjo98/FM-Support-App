import { useEffect, useState } from "react";
import { fetchOee, type OeeSummary } from "../api";
import type { CustomerUser } from "../types";

function factorColor(pct: number) {
  if (pct >= 75) return "#15803d";
  if (pct >= 50) return "#b45309";
  return "#b91c1c";
}

function FactorBar({ label, pct, hint }: { label: string; pct: number; hint: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ fontWeight: 700, color: factorColor(pct) }}>{pct}%</span>
      </div>
      <div style={{ height: 8, background: "rgba(36,31,66,0.1)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: factorColor(pct), borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 11.5, color: "var(--md-on-surface-variant)", marginTop: 3 }}>{hint}</div>
    </div>
  );
}

export default function OeePage({ user }: { user: CustomerUser }) {
  const [data, setData] = useState<OeeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOee(user.organizationId).then(setData).catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [user.organizationId]);

  if (error) return <div className="cust-error">{error}</div>;
  if (!data) return <p className="cust-empty">Loading OEE…</p>;

  const noProduction = data.fleet.totalProduced === 0;

  return (
    <div>
      <p className="cust-empty" style={{ marginBottom: 18 }}>
        Overall Equipment Effectiveness = Availability × Performance × Quality — the standard lean-manufacturing
        way to see which factor is actually dragging output down, instead of one blended number.
      </p>

      <div className="cust-card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div className="cust-stat-label">Fleet-wide OEE this month</div>
            <div style={{ fontSize: 42, fontWeight: 800, color: factorColor(data.fleet.oee) }}>{data.fleet.oee}%</div>
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <FactorBar label="Availability" pct={data.fleet.availability} hint="Runtime vs. planned time this month" />
            <FactorBar label="Performance" pct={data.fleet.performance} hint="Pieces produced vs. theoretical max at standard rate" />
            <FactorBar label="Quality" pct={data.fleet.quality} hint="Good pieces vs. total pieces produced" />
          </div>
        </div>
        {noProduction && (
          <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--md-warning-bg)", borderRadius: 10, fontSize: 13, color: "var(--md-warning)" }}>
            No production has been logged yet this month — log pieces produced on the Defect Log page's
            end-of-shift form to see real Performance and Quality numbers instead of 0%.
          </div>
        )}
        <div style={{ display: "flex", gap: 24, marginTop: 14, fontSize: 12.5, color: "var(--md-on-surface-variant)" }}>
          <span>{data.fleet.totalProduced.toLocaleString()} pieces produced</span>
          <span>{data.fleet.totalDefects.toLocaleString()} defects logged</span>
          <span>{data.fleet.totalDowntimeHours} hrs downtime</span>
        </div>
      </div>

      <div className="cust-card">
        <h3 className="cust-section-title" style={{ marginTop: 0 }}>By machine (worst first)</h3>
        {data.machines.length === 0 ? (
          <p className="cust-empty">No machines on file yet.</p>
        ) : (
          <table className="cust-table">
            <thead>
              <tr>
                <th>Machine</th>
                <th>Availability</th>
                <th>Performance</th>
                <th>Quality</th>
                <th>OEE</th>
              </tr>
            </thead>
            <tbody>
              {data.machines.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{m.displayName}</div>
                    <div style={{ fontSize: 11, color: "var(--md-on-surface-variant)" }}>{m.serialNumber}{m.location ? ` · ${m.location}` : ""}</div>
                  </td>
                  <td>{m.availability}%</td>
                  <td>{m.performance}%</td>
                  <td>{m.quality}%</td>
                  <td style={{ fontWeight: 700, color: factorColor(m.oee) }}>{m.oee}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
