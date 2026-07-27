import { useEffect, useRef, useState } from "react";
import { Maximize2, X, AlertTriangle, Clock, CheckCircle2, RefreshCw } from "lucide-react";
import { fetchAndon, type AndonMachine, type AndonStatus, type AndonSummary } from "../api";
import type { CustomerUser } from "../types";

const STATUS_CFG: Record<AndonStatus, { label: string; bg: string; color: string; icon: typeof CheckCircle2 }> = {
  red: { label: "Down", bg: "var(--md-error-bg)", color: "var(--md-error)", icon: AlertTriangle },
  amber: { label: "Attention", bg: "var(--md-warning-bg)", color: "var(--md-warning)", icon: Clock },
  green: { label: "Running", bg: "var(--md-success-bg)", color: "var(--md-success)", icon: CheckCircle2 },
};

// Toyota's andon cord makes a problem impossible to miss the moment it
// happens — this board is the digital version: every machine, at a glance,
// colored by whether it's actually down right now (an open ticket), needs
// attention soon (service due/overdue or an abnormal defect rate), or fine.
function Tile({ machine, big }: { machine: AndonMachine; big?: boolean }) {
  const cfg = STATUS_CFG[machine.andonStatus];
  const Icon = cfg.icon;
  return (
    <div
      style={{
        background: cfg.bg,
        borderRadius: big ? 20 : 16,
        padding: big ? "22px 20px" : "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: big ? 10 : 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: cfg.color }}>
        <Icon size={big ? 22 : 16} />
        <span style={{ fontWeight: 700, fontSize: big ? 15 : 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {cfg.label}
        </span>
      </div>
      <div style={{ fontWeight: 700, fontSize: big ? 22 : 15 }}>{machine.displayName}</div>
      <div style={{ fontSize: big ? 14 : 12, color: "var(--md-on-surface-variant)" }}>{machine.serialNumber}</div>
      <div style={{ fontSize: big ? 15 : 12.5, marginTop: "auto", color: cfg.color, fontWeight: 600 }}>{machine.reason}</div>
    </div>
  );
}

function Board({ data, big }: { data: AndonSummary; big?: boolean }) {
  const locations = Array.from(new Set(data.machines.map((m) => m.location ?? "Unassigned"))).sort();
  return (
    <div>
      {locations.map((loc) => {
        const group = data.machines.filter((m) => (m.location ?? "Unassigned") === loc);
        if (group.length === 0) return null;
        return (
          <div key={loc} style={{ marginBottom: big ? 32 : 20 }}>
            <div style={{ fontSize: big ? 16 : 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--md-on-surface-variant)", marginBottom: big ? 14 : 8 }}>
              {loc}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${big ? 260 : 200}px, 1fr))`, gap: big ? 16 : 10 }}>
              {group.map((m) => <Tile key={m.id} machine={m} big={big} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AndonBoardPage({ user }: { user: CustomerUser }) {
  const [data, setData] = useState<AndonSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kiosk, setKiosk] = useState(false);
  const kioskRef = useRef<HTMLDivElement>(null);

  function load() {
    fetchAndon(user.organizationId).then(setData).catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }
  useEffect(load, [user.organizationId]);

  // A wall-mounted board is only useful if it stays current — refresh on a
  // timer while in kiosk mode rather than requiring someone to reload it.
  useEffect(() => {
    if (!kiosk) return;
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kiosk, user.organizationId]);

  async function enterKiosk() {
    setKiosk(true);
    try { await kioskRef.current?.requestFullscreen?.(); } catch { /* fullscreen is a nice-to-have, not required */ }
  }
  async function exitKiosk() {
    if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch { /* ignore */ } }
    setKiosk(false);
  }

  if (error) return <div className="cust-error">{error}</div>;
  if (!data) return <p className="cust-empty">Loading floor status…</p>;

  return (
    <div>
      <p className="cust-empty" style={{ marginBottom: 18 }}>
        Every machine, colored the moment something needs attention — like Toyota's andon system, this is
        built to be seen at a glance, not read through in a ticket list.
      </p>

      <div className="cust-stat-grid">
        <div className="cust-card" style={{ borderLeft: "4px solid var(--md-error)" }}>
          <div className="cust-stat-label">Down</div>
          <div className="cust-stat-value">{data.summary.red}</div>
        </div>
        <div className="cust-card" style={{ borderLeft: "4px solid var(--md-warning)" }}>
          <div className="cust-stat-label">Needs attention</div>
          <div className="cust-stat-value">{data.summary.amber}</div>
        </div>
        <div className="cust-card" style={{ borderLeft: "4px solid var(--md-success)" }}>
          <div className="cust-stat-label">Running fine</div>
          <div className="cust-stat-value">{data.summary.green}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
        <button className="cust-button-secondary" onClick={load} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={14} /> Refresh
        </button>
        <button className="cust-button" onClick={enterKiosk} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Maximize2 size={14} /> Floor display mode
        </button>
      </div>

      <div className="cust-card">
        <Board data={data} />
      </div>

      {kiosk && (
        <div
          ref={kioskRef}
          style={{
            position: "fixed", inset: 0, zIndex: 500, background: "var(--md-background)",
            padding: "32px 40px", overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: 28 }}>Factory Floor Status</h1>
            <button className="cust-modal-close" onClick={exitKiosk} aria-label="Exit floor display mode">
              <X size={16} />
            </button>
          </div>
          <Board data={data} big />
        </div>
      )}
    </div>
  );
}
