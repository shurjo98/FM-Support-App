import { useEffect, useState } from "react";
import {
  Check, Download, Plus, X,
  Droplet, Sparkles, SearchCheck, Zap, Wind, Wrench,
  ChevronDown, ChevronUp, PartyPopper,
  type LucideIcon,
} from "lucide-react";
import {
  fetchHiddenCost,
  updateHiddenCostSettings,
  maintenanceReportPdfUrl,
  fetchMaintenance,
  completeMaintenanceTask,
  createMaintenanceTask,
  deleteMaintenanceTask,
  fetchAnalyticsFleet,
  type CostSettings,
  type HiddenCostSummary,
  type MaintenanceOverview,
  type MaintenanceTaskRow,
  type MaintenanceFrequency,
  type AnalyticsFleetMachine,
} from "../api";
import type { CustomerUser } from "../types";

const FREQ_LABEL: Record<MaintenanceFrequency, string> = { DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly" };
const FREQUENCIES: MaintenanceFrequency[] = ["DAILY", "WEEKLY", "MONTHLY"];
const MUTED = "rgba(255,255,255,0.55)";
const FAINT = "rgba(255,255,255,0.35)";

// Custom (user-added) tasks get this id prefix from the backend — used to
// decide whether the delete button shows, since category is user-editable
// and can't reliably signal "did I create this" on its own.
function isCustomTask(taskId: string): boolean {
  return taskId.startsWith("mtask-custom-");
}

// One colored icon per task category, Connecteam-checklist style — makes a
// long list scannable at a glance instead of reading as rows in a table.
const CATEGORY_CFG: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  Lubrication: { icon: Droplet, color: "#60a5fa", bg: "rgba(96,165,250,0.18)" },
  Cleaning: { icon: Sparkles, color: "#c084fc", bg: "rgba(192,132,252,0.18)" },
  Inspection: { icon: SearchCheck, color: "#22d3ee", bg: "rgba(34,211,238,0.18)" },
  Electrical: { icon: Zap, color: "#fbbf24", bg: "rgba(251,191,36,0.18)" },
  Pneumatic: { icon: Wind, color: "#2dd4bf", bg: "rgba(45,212,191,0.18)" },
};
const CATEGORY_OPTIONS = ["Lubrication", "Cleaning", "Inspection", "Electrical", "Pneumatic", "Custom"];
function categoryCfg(category: string) {
  return CATEGORY_CFG[category] ?? { icon: Wrench, color: "#9ca3af", bg: "rgba(156,163,175,0.18)" };
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
          background: data.totalHiddenCost > 0 ? "rgba(220,38,38,0.12)" : "rgba(22,163,74,0.12)",
          border: `1px solid ${data.totalHiddenCost > 0 ? "rgba(248,113,113,0.4)" : "rgba(74,222,128,0.4)"}`,
          borderRadius: 14,
          padding: "16px 20px",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 12, color: MUTED }}>Total hidden cost this month</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: data.totalHiddenCost > 0 ? "#f87171" : "#4ade80" }}>
          ৳{data.totalHiddenCost.toLocaleString()}
        </div>
        <div style={{ display: "flex", gap: 24, marginTop: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, color: FAINT }}>Lost production</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>৳{data.lostProductionValue.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: FAINT }}>Idle labor</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>৳{data.idleLaborCost.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: FAINT }}>Downtime this month</div>
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
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>{label}</div>
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
          <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 8 }}>
            Machines costing the most this month
          </div>
          {data.byMachine.map((m) => (
            <div
              key={m.label}
              style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.08)", fontSize: 13 }}
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

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onComplete,
  onRemove,
  completing,
}: {
  task: MaintenanceTaskRow;
  onComplete: (id: string) => void;
  onRemove: (id: string) => void;
  completing: boolean;
}) {
  const cfg = categoryCfg(task.category);
  const Icon = cfg.icon;
  const isDone = task.status === "ok";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <div
        style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: cfg.bg, color: cfg.color,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Icon size={17} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{task.name}</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 2, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span>{task.machineLabel} · {task.serialNumber}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{FREQ_LABEL[task.frequency]}</span>
          {task.lastCompletedAt && (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>Last done {new Date(task.lastCompletedAt).toLocaleDateString("en-GB")}</span>
            </>
          )}
        </div>
      </div>

      {isCustomTask(task.id) && (
        <button
          onClick={() => onRemove(task.id)}
          style={{ background: "none", border: "none", cursor: "pointer", color: FAINT, padding: 4 }}
          title="Remove task"
        >
          <X size={14} />
        </button>
      )}

      <button
        onClick={() => onComplete(task.id)}
        disabled={completing}
        title={isDone ? "Completed — tap to log again" : "Mark done"}
        style={{
          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
          border: isDone ? "none" : "2px solid rgba(255,255,255,0.25)",
          background: isDone ? "#16a34a" : "transparent",
          color: isDone ? "white" : "rgba(255,255,255,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: completing ? "default" : "pointer",
          opacity: completing ? 0.5 : 1,
          transition: "background 0.15s, border-color 0.15s, transform 0.1s",
        }}
      >
        <Check size={17} strokeWidth={3} />
      </button>
    </div>
  );
}

// ─── Collapsible urgency section ───────────────────────────────────────────────

function Section({
  title,
  dotColor,
  tasks,
  defaultOpen,
  onComplete,
  onRemove,
  completingId,
}: {
  title: string;
  dotColor: string;
  tasks: MaintenanceTaskRow[];
  defaultOpen: boolean;
  onComplete: (id: string) => void;
  onRemove: (id: string) => void;
  completingId: string | null;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (tasks.length === 0) return null;

  return (
    <div className="cust-card" style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", textAlign: "left",
        }}
      >
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
        <span style={{ fontSize: 12, color: MUTED }}>{tasks.length}</span>
        <span style={{ flex: 1 }} />
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} onComplete={onComplete} onRemove={onRemove} completing={completingId === t.id} />
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
  equipment: AnalyticsFleetMachine[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [machineInstanceId, setMachineInstanceId] = useState(equipment[0]?.id ?? "");
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]!);
  const [frequency, setFrequency] = useState<MaintenanceFrequency>("WEEKLY");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim() || !machineInstanceId) return;
    setSubmitting(true);
    setError(null);
    try {
      await createMaintenanceTask({ organizationId, machineInstanceId, name: name.trim(), category, frequency });
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
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>Machine</div>
            <select className="cust-input" value={machineInstanceId} onChange={(e) => setMachineInstanceId(e.target.value)} style={{ width: "100%" }}>
              {equipment.map((e) => (
                <option key={e.id} value={e.id}>{e.displayName} — {e.serialNumber}</option>
              ))}
            </select>
          </label>
          <label>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>Task name</div>
            <input className="cust-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Check needle plate wear" style={{ width: "100%" }} />
          </label>
          <label>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>Category</div>
            <select className="cust-input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%" }}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>Frequency</div>
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
  const [equipment, setEquipment] = useState<AnalyticsFleetMachine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | MaintenanceFrequency>("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  function load() {
    Promise.all([fetchMaintenance(user.organizationId), fetchAnalyticsFleet(user.organizationId)])
      .then(([m, e]) => {
        setData(m);
        setEquipment(e);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }
  useEffect(load, [user.organizationId]);

  async function markDone(taskId: string) {
    setCompletingId(taskId);
    try {
      await completeMaintenanceTask(taskId, { completedBy: user.name });
      load();
    } catch {
      // load() keeps showing the prior state; the button just re-enables
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
  const overdueTasks = filteredTasks.filter((t) => t.status === "overdue");
  const dueSoonTasks = filteredTasks.filter((t) => t.status === "due_soon");
  const notStartedTasks = filteredTasks.filter((t) => t.status === "never_done");
  const doneTasks = filteredTasks.filter((t) => t.status === "ok");

  const total = filteredTasks.length;
  const donePct = total > 0 ? Math.round((doneTasks.length / total) * 100) : 0;
  const allCaughtUp = overdueTasks.length === 0 && dueSoonTasks.length === 0;

  return (
    <div>
      <HiddenCostCard organizationId={user.organizationId} />

      <div className="cust-card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                background: `conic-gradient(#4ade80 ${donePct * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#012544", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#4ade80" }}>
                {donePct}%
              </div>
            </div>
            <div>
              <h3 className="cust-section-title" style={{ margin: 0 }}>Scheduled Maintenance</h3>
              <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>
                {allCaughtUp
                  ? "Nothing urgent — nice work staying on top of it."
                  : `${overdueTasks.length + dueSoonTasks.length} task${overdueTasks.length + dueSoonTasks.length === 1 ? "" : "s"} need${overdueTasks.length + dueSoonTasks.length === 1 ? "s" : ""} attention`}
              </div>
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
        <div style={{ display: "inline-flex", padding: 3, background: "rgba(255,255,255,0.06)", borderRadius: 10, gap: 2 }}>
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
                color: filter === f ? "white" : MUTED,
              }}
            >
              {f === "ALL" ? "All" : FREQ_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {total === 0 && (
        <div className="cust-card">
          <p className="cust-empty">No machines with maintenance tasks yet — register a machine under My Equipment first.</p>
        </div>
      )}

      {allCaughtUp && total > 0 && notStartedTasks.length === 0 && (
        <div className="cust-card" style={{ marginBottom: 12, textAlign: "center", padding: "28px 18px" }}>
          <PartyPopper size={26} style={{ color: "#4ade80", marginBottom: 8 }} />
          <div style={{ fontWeight: 700, fontSize: 15 }}>All caught up!</div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>Every task in this view has been completed on schedule.</div>
        </div>
      )}

      <Section title="Needs attention now" dotColor="#f87171" tasks={overdueTasks} defaultOpen onComplete={markDone} onRemove={removeTask} completingId={completingId} />
      <Section title="Due soon" dotColor="#fbbf24" tasks={dueSoonTasks} defaultOpen onComplete={markDone} onRemove={removeTask} completingId={completingId} />
      <Section title="Not started yet" dotColor="rgba(255,255,255,0.35)" tasks={notStartedTasks} defaultOpen={false} onComplete={markDone} onRemove={removeTask} completingId={completingId} />
      <Section title="Done" dotColor="#4ade80" tasks={doneTasks} defaultOpen={false} onComplete={markDone} onRemove={removeTask} completingId={completingId} />

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
