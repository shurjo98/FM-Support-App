import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { fetchDefects, logDefect, fetchAnalyticsFleet, type DefectSummary, type AnalyticsFleetMachine } from "../api";
import type { CustomerUser } from "../types";

const DEFECT_TYPES = [
  { value: "SKIP_STITCH",    label: "Skip Stitch" },
  { value: "BROKEN_STITCH",  label: "Broken Stitch" },
  { value: "NEEDLE_HOLE",    label: "Needle Hole" },
  { value: "PUCKERING",      label: "Puckering" },
  { value: "TENSION",        label: "Tension Issue" },
  { value: "OTHER",          label: "Other" },
];

const SHIFTS = [
  { value: "MORNING", label: "Morning" },
  { value: "EVENING", label: "Evening" },
  { value: "NIGHT",   label: "Night" },
];

const TYPE_COLORS: Record<string, string> = {
  SKIP_STITCH: "#2563eb", BROKEN_STITCH: "#dc2626",
  NEEDLE_HOLE: "#d97706", PUCKERING: "#7c3aed",
  TENSION: "#0891b2", OTHER: "#6b7280",
};

export default function DefectLogPage({ user }: { user: CustomerUser }) {
  const [summary, setSummary] = useState<DefectSummary | null>(null);
  const [fleet, setFleet] = useState<AnalyticsFleetMachine[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [serialNumber, setSerialNumber] = useState("");
  const [machineName, setMachineName] = useState("");
  const [defectType, setDefectType] = useState("SKIP_STITCH");
  const [count, setCount] = useState(1);
  const [shift, setShift] = useState("MORNING");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function load() {
    Promise.all([
      fetchDefects(user.organizationId, 30),
      fetchAnalyticsFleet(user.organizationId),
    ])
      .then(([s, f]) => { setSummary(s); setFleet(f); })
      .catch((e) => setError(e.message));
  }
  useEffect(load, [user.organizationId]);

  function handleMachineSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const sn = e.target.value;
    const machine = fleet.find((m) => m.serialNumber === sn);
    setSerialNumber(sn);
    setMachineName(machine ? `${machine.displayName} (${sn})` : sn);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await logDefect({
        organizationId: user.organizationId,
        serialNumber: serialNumber || undefined,
        machineName: machineName || undefined,
        defectType, count, shift,
        loggedByUserId: user.id,
      });
      setCount(1); setSubmitted(true);
      setTimeout(() => { setSubmitted(false); load(); }, 1200);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to log"); }
    finally { setSubmitting(false); }
  }

  if (error) return <div className="cust-error">{error}</div>;
  if (!summary) return <p className="cust-empty">Loading defect data…</p>;

  return (
    <div>
      {/* Anomaly alerts */}
      {summary.anomalies.length > 0 && (
        <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10 }}>
          <AlertTriangle size={18} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 600, color: "#92400e" }}>Abnormal defect rate detected</div>
            <div style={{ fontSize: 13, color: "#78350f", marginTop: 2 }}>
              These machines have 2× higher defect rates than usual this week: <strong>{summary.anomalies.join(", ")}</strong>.
              Consider raising a support ticket.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Log form */}
        <form className="cust-card cust-form" onSubmit={handleSubmit}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700 }}>Log end-of-shift defects</h3>

          <label>
            Machine
            <select value={serialNumber} onChange={handleMachineSelect} style={{ width: "100%" }}>
              <option value="">Select a machine…</option>
              {fleet.map((m) => (
                <option key={m.id} value={m.serialNumber}>
                  {m.displayName} — {m.serialNumber}{m.location ? ` (${m.location})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            Defect type
            <select value={defectType} onChange={(e) => setDefectType(e.target.value)} style={{ width: "100%" }}>
              {DEFECT_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </label>

          <label>
            Count (defective pieces)
            <input className="cust-input" type="number" min={1} value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ width: "100%" }} />
          </label>

          <label>
            Shift
            <select value={shift} onChange={(e) => setShift(e.target.value)} style={{ width: "100%" }}>
              {SHIFTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>

          {submitted ? (
            <div style={{ padding: "10px", background: "rgba(22,163,74,0.12)", borderRadius: 8, color: "#16a34a", fontWeight: 600, textAlign: "center" }}>
              ✓ Logged
            </div>
          ) : (
            <button className="cust-button" type="submit" disabled={submitting || !serialNumber}>
              {submitting ? "Logging…" : "Log defects"}
            </button>
          )}
        </form>

        {/* Summary stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="cust-card">
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Total defects (last 30 days)</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{summary.totalDefects.toLocaleString()}</div>
          </div>
          <div className="cust-card">
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>By defect type</div>
            {(() => {
              const byType: Record<string, number> = {};
              for (const log of summary.logs) {
                byType[log.defectType] = (byType[log.defectType] ?? 0) + log.count;
              }
              const max = Math.max(...Object.values(byType), 1);
              return Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, cnt]) => (
                <div key={type} style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                    <span>{DEFECT_TYPES.find((d) => d.value === type)?.label ?? type}</span>
                    <span style={{ fontWeight: 600 }}>{cnt}</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(148,163,184,0.2)", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${(cnt / max) * 100}%`, background: TYPE_COLORS[type] ?? "#6b7280", borderRadius: 2 }} />
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Machine defect table */}
      {summary.machineSummary.length > 0 && (
        <div className="cust-card" style={{ marginTop: 16 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700 }}>Machines by defect count (last 30 days)</h3>
          <table className="cust-table">
            <thead>
              <tr>
                <th>Machine</th>
                <th>Serial</th>
                <th>Total Defects</th>
                <th>Top Defect Type</th>
              </tr>
            </thead>
            <tbody>
              {summary.machineSummary.map((m) => {
                const topType = Object.entries(m.byType).sort((a, b) => b[1] - a[1])[0];
                const isAnomaly = summary.anomalies.includes(m.machineName);
                return (
                  <tr key={m.serialNumber} style={{ background: isAnomaly ? "rgba(220,38,38,0.04)" : undefined }}>
                    <td>
                      {m.machineName}
                      {isAnomaly && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fee2e2", borderRadius: 4, padding: "1px 5px" }}>⚠ HIGH</span>}
                    </td>
                    <td style={{ fontSize: 12, color: "#9ca3af" }}>{m.serialNumber}</td>
                    <td style={{ fontWeight: 700 }}>{m.total}</td>
                    <td>
                      {topType ? (
                        <span style={{ fontSize: 12, color: TYPE_COLORS[topType[0] ?? "OTHER"] ?? "#6b7280" }}>
                          {DEFECT_TYPES.find((d) => d.value === topType[0])?.label ?? topType[0]} ({topType[1]})
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
