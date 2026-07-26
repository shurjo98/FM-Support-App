import { useEffect, useState } from "react";
import { CheckCircle2, Clock, AlertTriangle, HelpCircle, Download, Plus, X, Wrench, ChevronDown, ChevronUp } from "lucide-react";
import {
  fetchHiddenCost,
  updateHiddenCostSettings,
  maintenanceReportPdfUrl,
  fetchMaintenance,
  completeMaintenanceTask,
  createMaintenanceTask,
  deleteMaintenanceTask,
  fetchMyEquipment,
  type CostSettings,
  type HiddenCostSummary,
  type MaintenanceOverview,
  type MaintenanceTaskRow,
  type MaintenanceFrequency,
} from "../api";
import type { CustomerUser, EquipmentItem } from "../types";

const FREQ_LABEL: Record<MaintenanceFrequency, string> = { DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly" };
const FREQUENCIES: MaintenanceFrequency[] = ["DAILY", "WEEKLY", "MONTHLY"];

const STATUS_CFG = {
  ok: { label: "Up to date", color: "#16a34a", bg: "#dcfce7", icon: CheckCircle2 },
  due_soon: { label: "Due Soon", color: "#d97706", bg: "#fef3c7", icon: Clock },
  overdue: { label: "Overdue", color: "#dc2626", bg: "#fee2e2", icon: AlertTriangle },
  never_done: { label: "Never Done", color: "#6b7280", bg: "#f3f4f6", icon: HelpCircle },
} as const;

function StatusPill({ status }: { status: MaintenanceTaskRow["status"] }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 10px", borderRadius: 12,
        fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

// ─── Hidden cost card ─────────────────────────────────────────────────────────

function HiddenCostCard({ organizationId }: { organizationId: string }) {
  const [data, setData] = useState<HiddenCostSummary | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CostSettings | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    fetchHiddenCost(organizationId).then(setData).catch(() => {});
  }
  useEffect(load, [organizationId]);

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      await updateHiddenCostSettings(organizationId, form);
      load();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return (
      <div className="cust-card" style={{ marginBottom: 16 }}>
        <p className="cust-empty">Loading hidden cost…</p>
      </div>
    );
  }

  return (
    <div className="cust-card" style={{ marginBottom: 16 }}>
      <h3 className="cust-section-title" style={{ marginTop: 0 }}>Hidden Cost of Downtime This Month</h3>
      <p className="cust-empty" style={{ marginBottom: 14 }}>
        The obvious cost of downtime is the repair. The hidden part is what keeps adding up while the machine
        sits broken — lost production, and operators who still get paid to wait.
      </p>

      <div
        style={{
          background: data.totalHiddenCost > 0 ? "#fef2f2" : "#f0fdf4",
          border: `1px solid ${data.totalHiddenCost > 0 ? "#fca5a5" : "#86efac"}`,
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 12, color: "#6b7280" }}>Total hidden cost this month</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: data.totalHiddenCost > 0 ? "#dc2626" : "#16a34a" }}>
          ৳{data.totalHiddenCost.toLocaleString()}
        </div>
        <div style={{ display: "flex", gap: 24, marginTop: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Lost production</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>৳{data.lostProductionValue.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Idle labor</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>৳{data.idleLaborCost.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Downtime this month</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{data.thisMonthDowntimeHours} hrs</div>
          </div>
        </div>
      </div>

      {editing && form ? (
        <div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
            {(
              [
                ["piecesPerHour", "Pieces per hour (per machine)"],
                ["pricePerPiece", "Selling price per piece (৳)"],
                ["workersPerMachine", "Workers per machine"],
                ["hourlyWage", "Hourly wage per worker (৳)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{label}</div>
                <input
                  className="cust-input"
                  type="number"
                  min={0}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                  style={{ width: "100%" }}
                />
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="cust-button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button className="cust-button-secondary" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className="cust-button-secondary"
          onClick={() => {
            setForm(data.settings);
            setEditing(true);
          }}
        >
          Edit assumptions
        </button>
      )}

      {data.byMachine.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>
            Machines costing the most this month
          </div>
          {data.byMachine.map((m) => (
            <div
              key={m.label}
              style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(148,163,184,0.15)", fontSize: 13 }}
            >
              <span>{m.label} · {m.hours} hrs</span>
              <span style={{ fontWeight: 600 }}>৳{(m.lostProductionValue + m.idleLaborCost).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add task modal ───────────────────────────────────────────────────────────

function AddTaskModal({
  organizationId,
  equipment,
  onClose,
  onCreated,
}: {
  organizationId: string;
  equipment: EquipmentItem[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [machineInstanceId, setMachineInstanceId] = useState(equipment[0]?.id ?? "");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState<MaintenanceFrequency>("WEEKLY");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim() || !machineInstanceId) return;
    setSubmitting(true);
    setError(null);
    try {
      await createMaintenanceTask({ organizationId, machineInstanceId, name: name.trim(), category: category.trim() || undefined, frequency });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add task");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="cust-modal-overlay" onClick={onClose}>
      <div className="cust-modal" onClick={(e) => e.stopPropagation()}>
        <button className="cust-modal-close" onClick={onClose}><X size={16} /></button>
        <h2 className="cust-section-title" style={{ marginTop: 0 }}>Add Maintenance Task</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Machine</div>
            <select className="cust-input" value={machineInstanceId} onChange={(e) => setMachineInstanceId(e.target.value)} style={{ width: "100%" }}>
              {equipment.map((e) => (
                <option key={e.id} value={e.id}>{e.displayName} — {e.serialNumber}</option>
              ))}
            </select>
          </label>
          <label>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Task name</div>
            <input className="cust-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Check needle plate wear" style={{ width: "100%" }} />
          </label>
          <label>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Category (optional)</div>
            <input className="cust-input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Inspection" style={{ width: "100%" }} />
          </label>
          <label>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Frequency</div>
            <select className="cust-input" value={frequency} onChange={(e) => setFrequency(e.target.value as MaintenanceFrequency)} style={{ width: "100%" }}>
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>{FREQ_LABEL[f]}</option>
              ))}
            </select>
          </label>

          {error && <div className="cust-error">{error}</div>}

          <button className="cust-button" onClick={handleSubmit} disabled={submitting || !name.trim() || !machineInstanceId}>
            {submitting ? "Adding…" : "Add task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MaintenancePage({ user }: { user: CustomerUser }) {
  const [data, setData] = useState<MaintenanceOverview | null>(null);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | MaintenanceFrequency>("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  // null = not yet initialized. Machines needing attention start expanded;
  // everything else starts collapsed — with 20+ machines, a flat list of
  // every task on every machine is a wall of rows, not the "simple, at a
  // glance" view an owner actually wants. Once the user has toggled a group,
  // that stays sticky across reloads (e.g. after marking a task done) rather
  // than snapping open/closed again based on the new status.
  const [openGroups, setOpenGroups] = useState<Set<string> | null>(null);

  function load() {
    Promise.all([fetchMaintenance(user.organizationId), fetchMyEquipment(user.organizationId)])
      .then(([m, e]) => {
        setData(m);
        setEquipment(e);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }
  useEffect(load, [user.organizationId]);

  useEffect(() => {
    if (data && openGroups === null) {
      const needsAttention = new Set(
        data.tasks.filter((t) => t.status === "overdue" || t.status === "due_soon").map((t) => t.machineInstanceId)
      );
      setOpenGroups(needsAttention);
    }
  }, [data, openGroups]);

  function toggleGroup(machineId: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(machineId)) next.delete(machineId);
      else next.add(machineId);
      return next;
    });
  }

  async function markDone(taskId: string) {
    setCompletingId(taskId);
    try {
      await completeMaintenanceTask(taskId, { completedBy: user.name });
      load();
    } catch {
      // load() will simply keep showing the prior state; the button re-enables
    } finally {
      setCompletingId(null);
    }
  }

  async function removeTask(taskId: string) {
    await deleteMaintenanceTask(taskId);
    load();
  }

  if (error) return <div className="cust-error">{error}</div>;
  if (!data) return <p className="cust-empty">Loading maintenance schedule…</p>;

  const filteredTasks = filter === "ALL" ? data.tasks : data.tasks.filter((t) => t.frequency === filter);

  const machineGroups = new Map<string, { label: string; serialNumber: string; tasks: MaintenanceTaskRow[] }>();
  for (const t of filteredTasks) {
    if (!machineGroups.has(t.machineInstanceId)) {
      machineGroups.set(t.machineInstanceId, { label: t.machineLabel, serialNumber: t.serialNumber, tasks: [] });
    }
    machineGroups.get(t.machineInstanceId)!.tasks.push(t);
  }

  return (
    <div>
      <HiddenCostCard organizationId={user.organizationId} />

      <div className="cust-card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <div>
            <h3 className="cust-section-title" style={{ margin: 0 }}>Scheduled Maintenance</h3>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {data.counts.overdue > 0 && <span style={{ color: "#dc2626", fontWeight: 600 }}>{data.counts.overdue} overdue</span>}
              {data.counts.overdue > 0 && (data.counts.due_soon > 0) && " · "}
              {data.counts.due_soon > 0 && <span style={{ color: "#d97706", fontWeight: 600 }}>{data.counts.due_soon} due soon</span>}
              {data.counts.overdue === 0 && data.counts.due_soon === 0 && "Everything is up to date"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="cust-button-secondary" onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={14} /> Add task
            </button>
            <a
              href={maintenanceReportPdfUrl(user.organizationId)}
              download
              className="cust-button"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
            >
              <Download size={14} /> Download Report
            </a>
          </div>
        </div>

        {/* Segmented control */}
        <div style={{ display: "inline-flex", padding: 3, background: "rgba(148,163,184,0.15)", borderRadius: 10, gap: 2 }}>
          {(["ALL", ...FREQUENCIES] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                background: filter === f ? "#1890d8" : "transparent",
                color: filter === f ? "white" : "#6b7280",
              }}
            >
              {f === "ALL" ? "All" : FREQ_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {machineGroups.size === 0 && (
        <div className="cust-card">
          <p className="cust-empty">No machines with maintenance tasks yet — register a machine under My Equipment first.</p>
        </div>
      )}

      {[...machineGroups.entries()].map(([machineId, group]) => {
        const overdueCount = group.tasks.filter((t) => t.status === "overdue").length;
        const dueSoonCount = group.tasks.filter((t) => t.status === "due_soon").length;
        const neverDoneCount = group.tasks.filter((t) => t.status === "never_done").length;
        const isOpen = openGroups?.has(machineId) ?? false;

        return (
        <div key={machineId} className="cust-card" style={{ marginBottom: 12 }}>
          <button
            onClick={() => toggleGroup(machineId)}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", textAlign: "left",
            }}
          >
            <Wrench size={14} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>{group.label}</span>
            <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 12 }}>{group.serialNumber}</span>
            <span style={{ flex: 1 }} />
            {overdueCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fee2e2", borderRadius: 10, padding: "2px 8px" }}>
                {overdueCount} overdue
              </span>
            )}
            {dueSoonCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#d97706", background: "#fef3c7", borderRadius: 10, padding: "2px 8px" }}>
                {dueSoonCount} due soon
              </span>
            )}
            {overdueCount === 0 && dueSoonCount === 0 && neverDoneCount > 0 && (
              <span style={{ fontSize: 11, color: "#6b7280" }}>{neverDoneCount} never checked</span>
            )}
            {overdueCount === 0 && dueSoonCount === 0 && neverDoneCount === 0 && (
              <span style={{ fontSize: 11, color: "#9ca3af" }}>{group.tasks.length} tasks · up to date</span>
            )}
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {isOpen && <div style={{ marginTop: 10 }}>
          {group.tasks.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                padding: "8px 0", borderBottom: "1px solid rgba(148,163,184,0.15)",
              }}
            >
              <span style={{ fontSize: 11, color: "#9ca3af", minWidth: 56 }}>{FREQ_LABEL[t.frequency]}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{t.name}</span>
              <StatusPill status={t.status} />
              <span style={{ fontSize: 11, color: "#9ca3af" }}>
                {t.lastCompletedAt ? `Last done ${new Date(t.lastCompletedAt).toLocaleDateString("en-GB")}` : "Never done"}
              </span>
              <button
                className="cust-button-secondary"
                style={{ fontSize: 11, padding: "4px 10px" }}
                onClick={() => markDone(t.id)}
                disabled={completingId === t.id}
              >
                {completingId === t.id ? "Saving…" : "Mark done"}
              </button>
              {t.category === "Custom" && (
                <button
                  onClick={() => removeTask(t.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}
                  title="Remove task"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
          </div>}
        </div>
        );
      })}

      {showAdd && (
        <AddTaskModal
          organizationId={user.organizationId}
          equipment={equipment}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
    </div>
  );
}
