import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Download, TrendingDown, TrendingUp, Wrench } from "lucide-react";
import {
  compliancePdfUrl,
  fetchAnalyticsFleet,
  fetchAnalyticsNeedles,
  fetchAnalyticsOverview,
  type AnalyticsFleetMachine,
  type AnalyticsNeedleMonth,
  type AnalyticsOverview,
} from "../api";
import type { CustomerUser } from "../types";

type Tab = "overview" | "fleet" | "needles";

const SETTINGS_KEY = "fm_insights_settings";

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as {
      piecesPerHour?: number;
      pricePerPiece?: number;
    };
  } catch {
    return {};
  }
}

// ─── Status badge helpers ─────────────────────────────────────────────────────

const STATUS_CONFIG = {
  ok: { label: "Serviced", color: "#16a34a", bg: "#dcfce7", icon: CheckCircle2 },
  due_soon: { label: "Due Soon", color: "#d97706", bg: "#fef3c7", icon: Clock },
  overdue: { label: "Overdue", color: "#dc2626", bg: "#fee2e2", icon: AlertTriangle },
  unscheduled: { label: "No Schedule", color: "#6b7280", bg: "#f3f4f6", icon: Wrench },
} as const;

type ServiceStatus = AnalyticsFleetMachine["serviceStatus"];

function ServiceBadge({ status }: { status: ServiceStatus }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  const Icon = cfg.icon;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
        borderRadius: 6,
        padding: "2px 8px",
      }}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function formatMonth(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

// ─── Sub-pages ────────────────────────────────────────────────────────────────

function OverviewTab({ overview, organizationId }: { overview: AnalyticsOverview; organizationId: string }) {
  const saved = loadSettings();
  const [piecesPerHour, setPiecesPerHour] = useState(saved.piecesPerHour ?? 60);
  const [pricePerPiece, setPricePerPiece] = useState(saved.pricePerPiece ?? 50);

  function saveSettings(pph: number, ppp: number) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ piecesPerHour: pph, pricePerPiece: ppp }));
  }

  const estimatedLoss = Math.round(overview.thisMonthDowntimeHours * piecesPerHour * pricePerPiece);
  const needleDelta = overview.needleSpendLastMonth > 0
    ? Math.round(((overview.needleSpendThisMonth - overview.needleSpendLastMonth) / overview.needleSpendLastMonth) * 100)
    : null;
  const fleetHealthPct =
    overview.fleet.total > 0
      ? Math.round((overview.fleet.ok / overview.fleet.total) * 100)
      : 0;

  return (
    <div>
      {/* KPI row */}
      <div className="cust-stat-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        <div className="cust-card" style={{ borderLeft: "4px solid #dc2626" }}>
          <div className="cust-stat-label">Downtime This Month</div>
          <div className="cust-stat-value">{overview.thisMonthDowntimeHours} hrs</div>
        </div>
        <div className="cust-card" style={{ borderLeft: "4px solid #2563eb" }}>
          <div className="cust-stat-label">Avg. Resolution Time</div>
          <div className="cust-stat-value">{overview.avgResolutionHours} hrs</div>
        </div>
        <div className="cust-card" style={{ borderLeft: "4px solid #d97706" }}>
          <div className="cust-stat-label">Open Tickets</div>
          <div className="cust-stat-value">{overview.openTickets}</div>
        </div>
        <div className="cust-card" style={{ borderLeft: "4px solid #16a34a" }}>
          <div className="cust-stat-label">Fleet Health</div>
          <div className="cust-stat-value">{fleetHealthPct}%</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            {overview.fleet.ok}/{overview.fleet.total} serviced
          </div>
        </div>
        <div className="cust-card" style={{ borderLeft: "4px solid #7c3aed" }}>
          <div className="cust-stat-label">Needle Spend (MTD)</div>
          <div className="cust-stat-value">৳{overview.needleSpendThisMonth.toLocaleString()}</div>
          {needleDelta !== null && (
            <div
              style={{
                fontSize: 11,
                color: needleDelta > 0 ? "#dc2626" : "#16a34a",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              {needleDelta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {Math.abs(needleDelta)}% vs last month
            </div>
          )}
        </div>
      </div>

      {/* Downtime cost calculator */}
      <div className="cust-card" style={{ marginTop: 20 }}>
        <h3 className="cust-section-title" style={{ marginTop: 0 }}>Downtime Cost Estimate</h3>
        <p className="cust-empty" style={{ marginBottom: 14 }}>
          Enter your factory's production rate and average selling price to calculate the revenue lost
          to machine downtime this month.
        </p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <label style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Pieces per hour (per machine)</div>
            <input
              className="cust-input"
              type="number"
              min={1}
              value={piecesPerHour}
              onChange={(e) => {
                const v = Number(e.target.value);
                setPiecesPerHour(v);
                saveSettings(v, pricePerPiece);
              }}
              style={{ width: "100%" }}
            />
          </label>
          <label style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Selling price per piece (৳)</div>
            <input
              className="cust-input"
              type="number"
              min={1}
              value={pricePerPiece}
              onChange={(e) => {
                const v = Number(e.target.value);
                setPricePerPiece(v);
                saveSettings(piecesPerHour, v);
              }}
              style={{ width: "100%" }}
            />
          </label>
        </div>
        <div
          style={{
            background: estimatedLoss > 0 ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${estimatedLoss > 0 ? "#fca5a5" : "#86efac"}`,
            borderRadius: 10,
            padding: "14px 18px",
          }}
        >
          <div style={{ fontSize: 12, color: "#6b7280" }}>Estimated production loss this month</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: estimatedLoss > 0 ? "#dc2626" : "#16a34a" }}>
            ৳{estimatedLoss.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            {overview.thisMonthDowntimeHours} hrs × {piecesPerHour} pcs/hr × ৳{pricePerPiece}/pc
          </div>
        </div>
      </div>

      {/* Fleet health breakdown */}
      <div className="cust-card" style={{ marginTop: 16 }}>
        <h3 className="cust-section-title" style={{ marginTop: 0 }}>Fleet Status Breakdown</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {(
            [
              ["ok", "Serviced & up to date", "#16a34a"],
              ["due_soon", "Service due within 14 days", "#d97706"],
              ["overdue", "Service overdue", "#dc2626"],
              ["unscheduled", "No maintenance schedule", "#6b7280"],
            ] as const
          ).map(([key, label, color]) => (
            <div
              key={key}
              style={{
                flex: 1,
                minWidth: 140,
                background: "#f9fafb",
                borderRadius: 8,
                padding: "10px 14px",
                borderLeft: `4px solid ${color}`,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{overview.fleet[key]}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top problematic machines */}
      {overview.topMachines.length > 0 && (
        <div className="cust-card" style={{ marginTop: 16 }}>
          <h3 className="cust-section-title" style={{ marginTop: 0 }}>Machines Causing Most Downtime</h3>
          <table className="cust-table">
            <thead>
              <tr>
                <th>Machine / Serial</th>
                <th>Total Downtime</th>
                <th>Ticket Count</th>
                <th>Est. Loss</th>
              </tr>
            </thead>
            <tbody>
              {overview.topMachines.map((m) => (
                <tr key={m.serialNumber}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{m.label}</div>
                    {m.label !== m.serialNumber && (
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{m.serialNumber}</div>
                    )}
                  </td>
                  <td>{m.hours} hrs</td>
                  <td>{m.count}</td>
                  <td>৳{Math.round(m.hours * piecesPerHour * pricePerPiece).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Compliance PDF */}
      <div className="cust-card" style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Buyer Compliance Report</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Download a signed maintenance compliance PDF for buyer audits — lists all machines,
            service dates, and health status.
          </div>
        </div>
        <a
          href={compliancePdfUrl(organizationId)}
          download
          className="cust-button"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", flexShrink: 0 }}
        >
          <Download size={15} /> Download PDF
        </a>
      </div>
    </div>
  );
}

function FleetTab({
  fleet,
  organizationId,
}: {
  fleet: AnalyticsFleetMachine[];
  organizationId: string;
}) {
  const [filter, setFilter] = useState<"all" | AnalyticsFleetMachine["serviceStatus"]>("all");

  const locations = Array.from(new Set(fleet.map((m) => m.location ?? "Unassigned"))).sort();
  const visible = fleet.filter((m) => filter === "all" || m.serviceStatus === filter);

  const counts = {
    ok: fleet.filter((m) => m.serviceStatus === "ok").length,
    due_soon: fleet.filter((m) => m.serviceStatus === "due_soon").length,
    overdue: fleet.filter((m) => m.serviceStatus === "overdue").length,
    unscheduled: fleet.filter((m) => m.serviceStatus === "unscheduled").length,
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {(
          [
            ["all", `All (${fleet.length})`, "#374151"],
            ["overdue", `Overdue (${counts.overdue})`, "#dc2626"],
            ["due_soon", `Due Soon (${counts.due_soon})`, "#d97706"],
            ["ok", `Serviced (${counts.ok})`, "#16a34a"],
            ["unscheduled", `No Schedule (${counts.unscheduled})`, "#6b7280"],
          ] as const
        ).map(([key, label, color]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              border: `1.5px solid ${filter === key ? color : "#e5e7eb"}`,
              background: filter === key ? color : "white",
              color: filter === key ? "white" : color,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
        <a
          href={compliancePdfUrl(organizationId)}
          download
          className="cust-button"
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            textDecoration: "none",
            fontSize: 13,
          }}
        >
          <Download size={14} /> Compliance PDF
        </a>
      </div>

      {visible.length === 0 ? (
        <p className="cust-empty">No machines in this category.</p>
      ) : (
        locations.map((loc) => {
          const group = visible.filter((m) => (m.location ?? "Unassigned") === loc);
          if (group.length === 0) return null;
          return (
            <div key={loc} style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#9ca3af",
                  marginBottom: 8,
                }}
              >
                {loc}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 10,
                }}
              >
                {group.map((m) => (
                  <div
                    key={m.id}
                    className="cust-card"
                    style={{
                      padding: "12px 14px",
                      borderLeft: `4px solid ${STATUS_CONFIG[m.serviceStatus].color}`,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{m.displayName}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>
                      {m.displayBrand}
                      {m.displayCategory ? ` · ${m.displayCategory}` : ""}
                      {!m.isCatalogMachine ? " · Custom" : ""}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
                      SN: {m.serialNumber}
                    </div>
                    <ServiceBadge status={m.serviceStatus} />
                    {m.nextServiceDue && (
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 5 }}>
                        Next due: {new Date(m.nextServiceDue).toLocaleDateString()}
                      </div>
                    )}
                    {m.lastServicedAt && (
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                        Last serviced: {new Date(m.lastServicedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function NeedlesTab({ data }: { data: { months: AnalyticsNeedleMonth[]; last5Avg: number; isAnomaly: boolean } }) {
  const maxQty = Math.max(...data.months.map((m) => m.quantity), 1);
  const currentMonth = data.months[5];

  return (
    <div>
      {data.isAnomaly && (
        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #fcd34d",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <AlertTriangle size={18} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 600, color: "#92400e" }}>Abnormal needle consumption detected</div>
            <div style={{ fontSize: 13, color: "#78350f", marginTop: 2 }}>
              This month's usage ({currentMonth.quantity.toLocaleString()} pcs) is significantly above your
              5-month average ({data.last5Avg.toLocaleString()} pcs). High needle consumption often signals
              machine timing issues, incorrect needle type, or thread tension problems — check your machines.
            </div>
          </div>
        </div>
      )}

      {/* Bar chart */}
      <div className="cust-card" style={{ marginBottom: 16 }}>
        <h3 className="cust-section-title" style={{ marginTop: 0 }}>Monthly Needle Consumption (last 6 months)</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120, padding: "0 4px" }}>
          {data.months.map((m, i) => {
            const isCurrent = i === 5;
            const barH = maxQty > 0 ? Math.max(4, Math.round((m.quantity / maxQty) * 100)) : 4;
            const color = isCurrent && data.isAnomaly ? "#dc2626" : isCurrent ? "#2563eb" : "#93c5fd";
            return (
              <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 10, color: "#6b7280" }}>{m.quantity > 0 ? m.quantity.toLocaleString() : ""}</div>
                <div
                  style={{
                    width: "100%",
                    height: barH,
                    background: color,
                    borderRadius: "4px 4px 0 0",
                    transition: "height 0.3s",
                  }}
                />
                <div style={{ fontSize: 10, color: "#9ca3af", textAlign: "center" }}>{formatMonth(m.month)}</div>
              </div>
            );
          })}
        </div>
        {data.last5Avg > 0 && (
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 10 }}>
            5-month average: {data.last5Avg.toLocaleString()} pcs/month
          </div>
        )}
      </div>

      {/* Detail table */}
      <div className="cust-card">
        <table className="cust-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Quantity</th>
              <th>Spend (৳)</th>
              <th>Needle Types</th>
            </tr>
          </thead>
          <tbody>
            {[...data.months].reverse().map((m) => (
              <tr key={m.month}>
                <td>{formatMonth(m.month)}</td>
                <td>{m.quantity > 0 ? m.quantity.toLocaleString() : "—"}</td>
                <td>{m.spend > 0 ? `৳${m.spend.toLocaleString()}` : "—"}</td>
                <td style={{ fontSize: 12 }}>{m.items.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function InsightsPage({ user }: { user: CustomerUser }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [fleet, setFleet] = useState<AnalyticsFleetMachine[] | null>(null);
  const [needles, setNeedles] = useState<{
    months: AnalyticsNeedleMonth[];
    last5Avg: number;
    isAnomaly: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const org = user.organizationId;
    Promise.all([
      fetchAnalyticsOverview(org),
      fetchAnalyticsFleet(org),
      fetchAnalyticsNeedles(org),
    ])
      .then(([ov, fl, nd]) => {
        setOverview(ov);
        setFleet(fl);
        setNeedles(nd);
      })
      .catch((err) => setError(err.message));
  }, [user.organizationId]);

  if (error) return <div className="cust-error">{error}</div>;
  if (!overview || !fleet || !needles) return <p className="cust-empty">Loading factory insights…</p>;

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "fleet", label: `Fleet Matrix (${fleet.length})` },
    { key: "needles", label: `Needle Analytics${needles.isAnomaly ? " ⚠️" : ""}` },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "2px solid #e5e7eb",
          marginBottom: 20,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 16px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? "#1d4ed8" : "#6b7280",
              borderBottom: `2px solid ${tab === t.key ? "#1d4ed8" : "transparent"}`,
              marginBottom: -2,
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab overview={overview} organizationId={user.organizationId} />}
      {tab === "fleet" && <FleetTab fleet={fleet} organizationId={user.organizationId} />}
      {tab === "needles" && <NeedlesTab data={needles} />}
    </div>
  );
}
