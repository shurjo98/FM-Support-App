import { useEffect, useState } from "react";
import {
  Check, ChevronRight, Download, Plus, X, ArrowLeft,
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
const MUTED = "rgba(36,31,66,0.62)";
const FAINT = "rgba(36,31,66,0.4)";

// Custom (user-added) tasks get this id prefix from the backend — used to
// decide whether the delete button shows, since category is user-editable
// and can't reliably signal "did I create this" on its own.
function isCustomTask(taskId: string): boolean {
  return taskId.startsWith("mtask-custom-");
}

// One colored icon per task category, Connecteam-checklist style — makes a
// long list scannable at a glance instead of reading as rows in a table.
const CATEGORY_CFG: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  Lubrication: { icon: Droplet, color: "#2563eb", bg: "rgba(37,99,235,0.14)" },
  Cleaning: { icon: Sparkles, color: "#9333ea", bg: "rgba(147,51,234,0.14)" },
  Inspection: { icon: SearchCheck, color: "#0891b2", bg: "rgba(8,145,178,0.14)" },
  Electrical: { icon: Zap, color: "#b45309", bg: "rgba(180,83,9,0.14)" },
  Pneumatic: { icon: Wind, color: "#0d9488", bg: "rgba(13,148,136,0.14)" },
};
const CATEGORY_OPTIONS = ["Lubrication", "Cleaning", "Inspection", "Electrical", "Pneumatic", "Custom"];
function categoryCfg(category: string) {
  return CATEGORY_CFG[category] ?? { icon: Wrench, color: "#6b5a54", bg: "rgba(107,90,84,0.14)" };
}

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

// ─── Hidden cost card (full detail — lives behind the Hidden Cost summary tap) ─

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
      <div className="cust-card">
        <p className="cust-empty">Loading hidden cost…</p>
      </div>
    );
  }

  return (
    <div className="cust-card">
      <p className="cust-empty" style={{ marginBottom: 14 }}>
        The obvious cost of downtime is the repair. The hidden part is what keeps adding up while the machine
        sits broken — lost production, and operators who still get paid to wait.
      </p>

      <div
        style={{
          background: data.totalHiddenCost > 0 ? "#fef2f2" : "#f0fdf4",
          border: `1px solid ${data.totalHiddenCost > 0 ? "#fca5a5" : "#86efac"}`,
          borderRadius: 14,
          padding: "16px 20px",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 12, color: MUTED }}>Total hidden cost this month</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: data.totalHiddenCost > 0 ? "#b91c1c" : "#15803d" }}>
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
              style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(36,31,66,0.1)", fontSize: 13 }}
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
  onRequestComplete,
  onRemove,
  completing,
}: {
  task: MaintenanceTaskRow;
  onRequestComplete: (task: MaintenanceTaskRow) => void;
  onRemove: (id: string) => void;
  completing: boolean;
}) {
  const cfg = categoryCfg(task.category);
  const Icon = cfg.icon;
  const isDone = task.status === "ok";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: "1px solid rgba(36,31,66,0.09)" }}>
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
        onClick={() => onRequestComplete(task)}
        disabled={completing}
        title={isDone ? "Completed — tap to log again" : "Mark done"}
        style={{
          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
          border: isDone ? "none" : "2px solid rgba(36,31,66,0.25)",
          background: isDone ? "#15803d" : "transparent",
          color: isDone ? "white" : "rgba(36,31,66,0.3)",
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
  onRequestComplete,
  onRemove,
  completingId,
}: {
  title: string;
  dotColor: string;
  tasks: MaintenanceTaskRow[];
  defaultOpen: boolean;
  onRequestComplete: (task: MaintenanceTaskRow) => void;
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
            <TaskRow key={t.id} task={t} onRequestComplete={onRequestComplete} onRemove={onRemove} completing={completingId === t.id} />
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

// ─── Complete task modal (poka-yoke: a note is required, not optional) ────────

function CompleteTaskModal({
  task,
  onClose,
  onConfirm,
  submitting,
}: {
  task: MaintenanceTaskRow;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  submitting: boolean;
}) {
  const [notes, setNotes] = useState("");

  return (
    <div className="cust-modal-overlay" onClick={onClose}>
      <div className="cust-modal" onClick={(e) => e.stopPropagation()}>
        <button className="cust-modal-close" onClick={onClose}><X size={16} /></button>
        <h2 className="cust-section-title" style={{ marginTop: 0 }}>Mark "{task.name}" done</h2>
        <p className="cust-empty" style={{ marginBottom: 14 }}>
          What did you check or replace? A one-line note keeps this schedule honest instead of a blind tap.
        </p>
        <textarea
          className="cust-input"
          rows={3}
          autoFocus
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Checked oil level, topped up 50ml"
          style={{ width: "100%", marginBottom: 12, resize: "vertical" }}
        />
        <button className="cust-button" onClick={() => onConfirm(notes)} disabled={submitting || !notes.trim()}>
          {submitting ? "Saving…" : "Mark done"}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type View = "landing" | "tasks" | "hiddenCost";

export default function MaintenancePage({ user }: { user: CustomerUser }) {
  const [view, setView] = useState<View>("landing");
  const [data, setData] = useState<MaintenanceOverview | null>(null);
  const [equipment, setEquipment] = useState<AnalyticsFleetMachine[]>([]);
  const [hiddenCostTotal, setHiddenCostTotal] = useState<HiddenCostSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | MaintenanceFrequency>("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [completingTask, setCompletingTask] = useState<MaintenanceTaskRow | null>(null);
  const [completing, setCompleting] = useState(false);

  function load() {
    Promise.all([fetchMaintenance(user.organizationId), fetchAnalyticsFleet(user.organizationId)])
      .then(([m, e]) => {
        setData(m);
        setEquipment(e);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }
  useEffect(load, [user.organizationId]);
  useEffect(() => {
    fetchHiddenCost(user.organizationId).then(setHiddenCostTotal).catch(() => {});
  }, [user.organizationId]);

  async function confirmComplete(notes: string) {
    if (!completingTask) return;
    setCompleting(true);
    try {
      await completeMaintenanceTask(completingTask.id, { completedBy: user.name, notes });
      setCompletingTask(null);
      load();
    } catch {
      // modal stays open with the error implicit — button just re-enables
    } finally {
      setCompleting(false);
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
  const needAttention = overdueTasks.length + dueSoonTasks.length;

  const completeModal = completingTask && (
    <CompleteTaskModal
      task={completingTask}
      onClose={() => setCompletingTask(null)}
      onConfirm={confirmComplete}
      submitting={completing}
    />
  );

  if (view === "hiddenCost") {
    return (
      <div>
        <DetailHeader title="Hidden Cost of Downtime This Month" onBack={() => setView("landing")} />
        <HiddenCostCard organizationId={user.organizationId} />
      </div>
    );
  }

  if (view === "tasks") {
    return (
      <div>
        <DetailHeader title="Scheduled Maintenance" onBack={() => setView("landing")} />

        <div className="cust-card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
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

          {/* Segmented control */}
          <div style={{ display: "inline-flex", padding: 3, background: "rgba(36,31,66,0.06)", borderRadius: 10, gap: 2 }}>
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
                  background: filter === f ? "#403D88" : "transparent",
                  color: filter === f ? "#FFFFFF" : MUTED,
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
            <PartyPopper size={26} style={{ color: "#15803d", marginBottom: 8 }} />
            <div style={{ fontWeight: 700, fontSize: 15 }}>All caught up!</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>Every task in this view has been completed on schedule.</div>
          </div>
        )}

        <Section title="Needs attention now" dotColor="#b91c1c" tasks={overdueTasks} defaultOpen onRequestComplete={setCompletingTask} onRemove={removeTask} completingId={completing ? completingTask?.id ?? null : null} />
        <Section title="Due soon" dotColor="#b45309" tasks={dueSoonTasks} defaultOpen onRequestComplete={setCompletingTask} onRemove={removeTask} completingId={completing ? completingTask?.id ?? null : null} />
        <Section title="Not started yet" dotColor="rgba(36,31,66,0.3)" tasks={notStartedTasks} defaultOpen={false} onRequestComplete={setCompletingTask} onRemove={removeTask} completingId={completing ? completingTask?.id ?? null : null} />
        <Section title="Done" dotColor="#15803d" tasks={doneTasks} defaultOpen={false} onRequestComplete={setCompletingTask} onRemove={removeTask} completingId={completing ? completingTask?.id ?? null : null} />

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
        {completeModal}
      </div>
    );
  }

  // ─── Landing ────────────────────────────────────────────────────────────────

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        <button
          className="cust-card cust-card-clickable"
          onClick={() => setView("tasks")}
          style={{ textAlign: "left", border: "none", cursor: "pointer", width: "100%", font: "inherit", color: "inherit" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                background: `conic-gradient(#15803d ${donePct * 3.6}deg, rgba(36,31,66,0.1) 0deg)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#FEF6F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#15803d" }}>
                {donePct}%
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="cust-section-title" style={{ margin: 0 }}>Scheduled Maintenance</div>
              <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>
                {allCaughtUp
                  ? "Nothing urgent — nice work staying on top of it."
                  : `${needAttention} task${needAttention === 1 ? "" : "s"} need${needAttention === 1 ? "s" : ""} attention`}
              </div>
            </div>
            <ChevronRight size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
          </div>
        </button>

        <button
          className="cust-card cust-card-clickable"
          onClick={() => setView("hiddenCost")}
          style={{ textAlign: "left", border: "none", cursor: "pointer", width: "100%", font: "inherit", color: "inherit" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="cust-section-title" style={{ margin: 0 }}>Hidden Cost of Downtime</div>
            <ChevronRight size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
          </div>
          {hiddenCostTotal ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: hiddenCostTotal.totalHiddenCost > 0 ? "#b91c1c" : "#15803d" }}>
                ৳{hiddenCostTotal.totalHiddenCost.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>estimated this month</div>
            </div>
          ) : (
            <p className="cust-empty" style={{ marginTop: 10 }}>Loading…</p>
          )}
        </button>
      </div>

      {completeModal}
    </div>
  );
}
