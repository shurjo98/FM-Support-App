import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, ChevronRight, CheckCircle2, Clock, Download, TrendingDown, TrendingUp, Wrench } from "lucide-react";
import {
  compliancePdfUrl,
  fetchAnalyticsFleet,
  fetchAnalyticsNeedles,
  fetchAnalyticsOverview,
  fetchHiddenCost,
  type AnalyticsFleetMachine,
  type AnalyticsNeedleMonth,
  type AnalyticsOverview,
  type HiddenCostSummary,
} from "../api";
import type { CustomerUser } from "../types";
import type { CustomerSection } from "./CustomerLayout";

type Tab = "overview" | "fleet" | "needles";
type OverviewDetail = "hiddenCost" | "topMachines" | "fleet" | null;

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

// A focused "one job per screen" detail header — tap a summary card on the
// landing, get the full picture, tap back. Reused by every drill-down below
// instead of stacking everything into one long scroll.
function DetailHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <button className="cust-button-secondary" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px" }}>
        <ArrowLeft size={14} /> Back
      </button>
      <h3 className="cust-section-title" style={{ margin: 0 }}>{title}</h3>
    </div>
  );
}

function SummaryCard({ title, onOpen, children }: { title: string; onOpen: () => void; children: React.ReactNode }) {
  return (
    <button
      className="cust-card cust-card-clickable"
      onClick={onOpen}
      style={{ textAlign: "left", border: "none", cursor: "pointer", width: "100%", font: "inherit", color: "inherit" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="cust-section-title" style={{ margin: 0 }}>{title}</div>
        <ChevronRight size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
      </div>
      {children}
    </button>
  );
}

// ─── Sub-pages ────────────────────────────────────────────────────────────────

function OverviewTab({
  overview,
  fleet,
  organizationId,
  onNavigate,
}: {
  overview: AnalyticsOverview;
  fleet: AnalyticsFleetMachine[];
  organizationId: string;
  onNavigate?: (section: CustomerSection) => void;
}) {
  const [hiddenCost, setHiddenCost] = useState<HiddenCostSummary | null>(null);
  const [detail, setDetail] = useState<OverviewDetail>(null);
  useEffect(() => {
    fetchHiddenCost(organizationId).then(setHiddenCost).catch(() => {});
  }, [organizationId]);

  const needleDelta = overview.needleSpendLastMonth > 0
    ? Math.round(((overview.needleSpendThisMonth - overview.needleSpendLastMonth) / overview.needleSpendLastMonth) * 100)
    : null;
  const fleetHealthPct =
    overview.fleet.total > 0
      ? Math.round((overview.fleet.ok / overview.fleet.total) * 100)
      : 0;

  // ─── Detail views ───────────────────────────────────────────────────────────

  if (detail === "hiddenCost") {
    return (
      <div>
        <DetailHeader title="Hidden Cost of Downtime" onBack={() => setDetail(null)} />
        <div className="cust-card">
          <p className="cust-empty" style={{ margin: "0 0 14px" }}>
            Lost production plus idle labor while machines sit broken. Full editable assumptions live on the
            Maintenance & Cost page.
          </p>
          {onNavigate && (
            <button
              className="cust-button-secondary"
              onClick={() => onNavigate("maintenance")}
              style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}
            >
              Edit assumptions <ChevronRight size={14} />
            </button>
          )}
          {hiddenCost && (
            <div
              style={{
                background: hiddenCost.totalHiddenCost > 0 ? "#fef2f2" : "#f0fdf4",
                border: `1px solid ${hiddenCost.totalHiddenCost > 0 ? "#fca5a5" : "#86efac"}`,
                borderRadius: 10,
                padding: "14px 18px",
              }}
            >
              <div style={{ fontSize: 12, color: "#6b7280" }}>Estimated total this month</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: hiddenCost.totalHiddenCost > 0 ? "#dc2626" : "#16a34a" }}>
                ৳{hiddenCost.totalHiddenCost.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                ৳{hiddenCost.lostProductionValue.toLocaleString()} lost production + ৳{hiddenCost.idleLaborCost.toLocaleString()} idle labor
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (detail === "fleet") {
    return (
      <div>
        <DetailHeader title="Fleet Status" onBack={() => setDetail(null)} />
        <FleetTab fleet={fleet} organizationId={organizationId} />
      </div>
    );
  }

  if (detail === "topMachines") {
    return (
      <div>
        <DetailHeader title="Machines Causing Most Downtime" onBack={() => setDetail(null)} />
        {overview.topMachines.length === 0 ? (
          <p className="cust-empty">No downtime recorded yet.</p>
        ) : (
          <div className="cust-card">
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
                    <td>
                      {hiddenCost
                        ? `৳${Math.round(m.hours * hiddenCost.settings.piecesPerHour * hiddenCost.settings.pricePerPiece).toLocaleString()}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ─── Landing ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* KPI row — already glanceable, kept as the one thing you see at a glance */}
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

      {/* Three tap-through summaries instead of three full stacked cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 20 }}>
        <SummaryCard title="Hidden Cost of Downtime" onOpen={() => setDetail("hiddenCost")}>
          {hiddenCost ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: hiddenCost.totalHiddenCost > 0 ? "#dc2626" : "#16a34a" }}>
                ৳{hiddenCost.totalHiddenCost.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>estimated this month</div>
            </div>
          ) : (
            <p className="cust-empty" style={{ marginTop: 10 }}>Loading…</p>
          )}
        </SummaryCard>

        <SummaryCard title="Fleet Health" onOpen={() => setDetail("fleet")}>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#16a34a" }}>{fleetHealthPct}%</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {overview.fleet.ok}/{overview.fleet.total} serviced · {overview.fleet.overdue} overdue
            </div>
          </div>
        </SummaryCard>

        <SummaryCard title="Machines Causing Most Downtime" onOpen={() => setDetail("topMachines")}>
          {overview.topMachines.length > 0 ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{overview.topMachines[0]!.label}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                {overview.topMachines[0]!.hours} hrs downtime · {overview.topMachines.length} machine{overview.topMachines.length === 1 ? "" : "s"} tracked
              </div>
            </div>
          ) : (
            <p className="cust-empty" style={{ marginTop: 10 }}>No downtime recorded yet.</p>
          )}
        </SummaryCard>
      </div>

      <div style={{ marginTop: 18 }}>
        <a
          href={compliancePdfUrl(organizationId)}
          download
          style={{ fontSize: 13, color: "#403D88", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontWeight: 600 }}
        >
          <Download size={14} /> Download Buyer Compliance Report
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
            const color = isCurrent && data.isAnomaly ? "#dc2626" : isCurrent ? "#403D88" : "#AF719D";
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

export default function InsightsPage({ user, onNavigate }: { user: CustomerUser; onNavigate?: (section: CustomerSection) => void }) {
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
              color: tab === t.key ? "#403D88" : "#6b7280",
              borderBottom: `2px solid ${tab === t.key ? "#403D88" : "transparent"}`,
              marginBottom: -2,
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab overview={overview} fleet={fleet} organizationId={user.organizationId} onNavigate={onNavigate} />}
      {tab === "fleet" && <FleetTab fleet={fleet} organizationId={user.organizationId} />}
      {tab === "needles" && <NeedlesTab data={needles} />}
    </div>
  );
}
