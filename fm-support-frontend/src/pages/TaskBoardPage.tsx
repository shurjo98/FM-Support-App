import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent, type ReactNode } from "react";
import {
  addTaskComment,
  createOrganization,
  createTask,
  deleteTask,
  fetchInternalAccounts,
  fetchOrganizations,
  fetchTaskNotifications,
  fetchTasks,
  markAllTaskNotificationsRead,
  updateTask,
  UnauthorizedError,
} from "../api";
import type { FactoryAccount, InternalAccountLite, InternalNotification, InternalTask, TaskColumn, TaskEventType, TaskPriority, TaskTeam } from "../types";
import { REGIONS } from "../types";
import { Avatar } from "../Avatar";
import { canManageTasks, isGm } from "../permissions";
import { Archive, Bell, Building2, Lock, MessageCircle, Plus, Sparkles, ArrowRightLeft, Zap, UserCheck, CalendarClock, SlidersHorizontal, Users, type LucideIcon } from "lucide-react";

// Highlights "@Full Name" substrings that match a known account — pure
// display-time formatting, mirrors the backend's parseMentions() matching
// (dashboard.ts) but doesn't need to agree exactly since this only affects
// rendering, not who gets notified.
function renderMentions(text: string, accounts: InternalAccountLite[]): ReactNode[] {
  const names = [...accounts].sort((a, b) => b.name.length - a.name.length).map((a) => a.name);
  if (names.length === 0) return [text];
  const pattern = new RegExp(`@(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "gi");
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <span key={key++} className="mention-highlight">
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

// A text input/textarea that pops a small account-picker below the cursor
// when the user types "@" — selecting one inserts "@Full Name " in place of
// the partial token. Used for task descriptions and comments.
function MentionAwareField({
  value,
  onChange,
  accounts,
  multiline,
  placeholder,
  rows,
}: {
  value: string;
  onChange: (v: string) => void;
  accounts: InternalAccountLite[];
  multiline?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  const [query, setQuery] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const inRef = useRef<HTMLInputElement>(null);

  function detectMention(newValue: string, cursor: number) {
    const uptoCursor = newValue.slice(0, cursor);
    const match = uptoCursor.match(/@([A-Za-z\s]{0,30})$/);
    setQuery(match ? match[1] ?? "" : null);
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
    onChange(e.target.value);
    detectMention(e.target.value, e.target.selectionStart ?? e.target.value.length);
  }

  function selectAccount(name: string) {
    const el = multiline ? taRef.current : inRef.current;
    const cursor = el?.selectionStart ?? value.length;
    const uptoCursor = value.slice(0, cursor);
    const replaced = uptoCursor.replace(/@([A-Za-z\s]{0,30})$/, `@${name} `);
    onChange(replaced + value.slice(cursor));
    setQuery(null);
    requestAnimationFrame(() => el?.focus());
  }

  const matches = query !== null ? accounts.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6) : [];

  return (
    <div className="mention-field-wrap">
      {multiline ? (
        <textarea
          ref={taRef}
          rows={rows ?? 3}
          value={value}
          placeholder={placeholder}
          onChange={handleChange}
          onBlur={() => setTimeout(() => setQuery(null), 150)}
        />
      ) : (
        <input
          ref={inRef}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={handleChange}
          onBlur={() => setTimeout(() => setQuery(null), 150)}
        />
      )}
      {matches.length > 0 && (
        <div className="mention-suggestions">
          {matches.map((a) => (
            <button key={a.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => selectAccount(a.name)}>
              <Avatar name={a.name} avatarUrl={a.avatarUrl} size={18} />
              <span>{a.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple on/off pill switch (iOS-style) — used for the "restrict visibility"
// toggle so setting task privacy reads as a single obvious tap.
function IosToggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: ReactNode }) {
  return (
    <div className="ios-toggle-row" onClick={onToggle} role="switch" aria-checked={on}>
      <span>{label}</span>
      <span className={`ios-toggle ${on ? "on" : ""}`}>
        <span className="ios-toggle-knob" />
      </span>
    </div>
  );
}

// Shared UI for setting who else besides the creator can see a restricted
// task — used by both NewTaskModal and TaskDetailModal.
function RestrictedVisibilityField({
  restricted,
  onToggleRestricted,
  allowedAccountIds,
  onToggleAllowed,
  accounts,
  excludeAccountId,
  disabled,
}: {
  restricted: boolean;
  onToggleRestricted: () => void;
  allowedAccountIds: string[];
  onToggleAllowed: (accountId: string) => void;
  accounts: InternalAccountLite[];
  excludeAccountId: string;
  disabled?: boolean;
}) {
  return (
    <div className="restricted-field">
      <IosToggle
        on={restricted}
        onToggle={disabled ? () => {} : onToggleRestricted}
        label={
          <>
            <Lock size={14} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            Restrict who can see this
          </>
        }
      />
      {restricted && (
        <div className="assist-chip-list">
          {accounts
            .filter((a) => a.id !== excludeAccountId)
            .map((a) => {
              const active = allowedAccountIds.includes(a.id);
              return (
                <label key={a.id} className={`assist-chip ${active ? "active" : ""}`}>
                  <input type="checkbox" checked={active} onChange={() => onToggleAllowed(a.id)} disabled={disabled} hidden />
                  <Avatar name={a.name} avatarUrl={a.avatarUrl} size={20} />
                  <span>{a.name}</span>
                </label>
              );
            })}
          <p className="empty restricted-field-hint">Leave everyone unchecked to keep this visible to only you (and GM).</p>
        </div>
      )}
    </div>
  );
}

const COLUMNS: { key: TaskColumn; label: string }[] = [
  { key: "BACKLOG", label: "Backlog" },
  { key: "PENDING", label: "Pending" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
];

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const TEAMS: TaskTeam[] = ["Software", "Hardware"];
const PRIORITY_RANK: Record<TaskPriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "#6b7280",
  MEDIUM: "#2563eb",
  HIGH: "#d97706",
  URGENT: "#dc2626",
};

const EVENT_ICON: Record<TaskEventType, LucideIcon> = {
  CREATED: Sparkles,
  MOVED: ArrowRightLeft,
  PRIORITY_CHANGED: Zap,
  ASSIGNED: UserCheck,
  DUE_DATE_CHANGED: CalendarClock,
  TEAM_CHANGED: Users,
};

function isOverdue(task: InternalTask): boolean {
  if (!task.dueDate || task.column === "COMPLETED") return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

const DRAG_THRESHOLD = 6;

interface DragState {
  taskId: string;
  pointerId: number;
  fromColumn: TaskColumn;
  originX: number;
  originY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  x: number;
  y: number;
  isDragging: boolean;
  overColumn: TaskColumn | null;
}

export default function TaskBoardPage({
  team,
  token,
  actingAccount,
  onUnauthorized,
}: {
  team: TaskTeam;
  token: string;
  actingAccount: InternalAccountLite;
  onUnauthorized: () => void;
}) {
  const [tasks, setTasks] = useState<InternalTask[] | null>(null);
  const [accounts, setAccounts] = useState<InternalAccountLite[]>([]);
  const [organizations, setOrganizations] = useState<FactoryAccount[]>([]);
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  // Mobile only: the 4-column kanban grid doesn't fit a phone width, so below
  // the existing 880px breakpoint we show one column at a time via this tab
  // strip instead — the drag-and-drop logic is untouched, hidden columns
  // just report a zero-size rect and are never a valid drop target.
  const [mobileColumn, setMobileColumn] = useState<TaskColumn>("BACKLOG");
  const [detailTask, setDetailTask] = useState<InternalTask | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showAddFactory, setShowAddFactory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  // Mobile only: search/region/mine/archived live behind this single toggle
  // instead of cluttering the top bar — desktop always shows them inline.
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  // Mobile only: dragging fights native scroll (touch-action:none swallows
  // scroll gestures that start on a card), and cross-column drop barely works
  // anyway since only one column is visible at a time. Below 880px, cards are
  // tap-to-open instead — reassigning a column happens via the detail
  // modal's Column dropdown.
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 880px)").matches);
  const columnRefs = useRef<Partial<Record<TaskColumn, HTMLDivElement>>>({});

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 880px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // GM can edit/restrict tasks the same as a Manager/Admin even without
  // holding either role — see the matching backend gate in dashboard.ts.
  const canManage = canManageTasks(actingAccount) || isGm(actingAccount);
  const unreadCount = notifications.filter((n) => !n.read).length;

  function load() {
    Promise.all([fetchTasks(token, actingAccount.id, showArchived), fetchInternalAccounts(token), fetchOrganizations(token)])
      .then(([t, a, o]) => {
        setTasks(t);
        setAccounts(a);
        setOrganizations(o);
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) return onUnauthorized();
        setError(err.message);
      });
  }

  function loadNotifications() {
    fetchTaskNotifications(token, actingAccount.id)
      .then(setNotifications)
      .catch(() => {});
  }

  useEffect(load, [token, showArchived, actingAccount.id]);
  useEffect(loadNotifications, [token, actingAccount.id]);

  // Auto-refresh: pick up task moves, assignments, and comments made by
  // other people without needing a manual reload.
  useEffect(() => {
    const interval = setInterval(() => {
      load();
      loadNotifications();
    }, 12000);
    return () => clearInterval(interval);
  }, [token, actingAccount.id]);

  async function moveTask(taskId: string, column: TaskColumn) {
    try {
      const updated = await updateTask(token, taskId, { column, actingAccountId: actingAccount.id });
      setTasks((prev) => prev?.map((t) => (t.id === taskId ? updated : t)) ?? prev);
      loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move task");
    }
  }

  // Pointer Events work for mouse AND touch, unlike the old HTML5 drag API
  // (which never fires on phones/tablets) — this is what makes dragging
  // cards work on mobile.
  function handlePointerDown(e: PointerEvent<HTMLDivElement>, task: InternalTask) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.setPointerCapture(e.pointerId);
    setDrag({
      taskId: task.id,
      pointerId: e.pointerId,
      fromColumn: task.column,
      originX: e.clientX,
      originY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
      isDragging: false,
      overColumn: null,
    });
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.originX;
    const dy = e.clientY - drag.originY;
    const isDragging = drag.isDragging || Math.hypot(dx, dy) > DRAG_THRESHOLD;

    let overColumn = drag.overColumn;
    if (isDragging) {
      overColumn = null;
      for (const col of COLUMNS) {
        const el = columnRefs.current[col.key];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          overColumn = col.key;
          break;
        }
      }
    }

    setDrag({ ...drag, x: e.clientX - drag.offsetX, y: e.clientY - drag.offsetY, isDragging, overColumn });
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>, task: InternalTask) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const { isDragging, overColumn } = drag;
    setDrag(null);
    if (!isDragging) {
      setDetailTask(task);
    } else if (overColumn && overColumn !== task.column) {
      moveTask(task.id, overColumn);
    }
  }

  function handleTaskUpdated(updated: InternalTask) {
    setTasks((prev) => prev?.map((t) => (t.id === updated.id ? updated : t)) ?? prev);
    setDetailTask(updated);
    loadNotifications();
  }

  async function handleDelete(taskId: string) {
    try {
      await deleteTask(token, taskId, actingAccount.id);
      setTasks((prev) => prev?.filter((t) => t.id !== taskId) ?? prev);
      setDetailTask(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  }

  async function handleMarkAllRead() {
    await markAllTaskNotificationsRead(token, actingAccount.id).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  if (error) return <div className="page-error">{error}</div>;
  if (!tasks) return <div className="page-loading">Loading task board...</div>;

  const visibleTasks = tasks.filter((t) => {
    if (t.team !== team) return false;
    if (myTasksOnly && !t.assignees.some((a) => a.accountId === actingAccount.id)) return false;
    if (searchQuery.trim() && !(t.organizationName ?? "").toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
    if (regionFilter && t.region !== regionFilter) return false;
    return true;
  });

  const activeFilterCount = [searchQuery.trim() !== "", regionFilter !== "", myTasksOnly, showArchived].filter(Boolean).length;

  return (
    <div className="kanban-page">
      <div className="kanban-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{team} Task Board</h2>
          <span style={{ fontSize: "0.75rem", color: "#6b7280", background: "#f3f4f6", borderRadius: 999, padding: "2px 10px" }}>
            {tasks?.filter((t) => t.team === team && t.column !== "COMPLETED").length ?? 0} active
          </span>
        </div>
        <div className="kanban-toolbar-actions">
          <button
            className="kanban-filter-toggle"
            onClick={() => setShowMobileFilters((v) => !v)}
            aria-label="Filters"
          >
            <SlidersHorizontal size={16} strokeWidth={2} />
            {activeFilterCount > 0 && <span className="kanban-filter-dot" />}
          </button>
          <div className={`kanban-filter-panel ${showMobileFilters ? "open" : ""}`}>
            <input
              type="text"
              className="kanban-search-input"
              placeholder="Search factory…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="kanban-search-input" style={{ width: "auto" }}>
              <option value="">All regions</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <label className="kanban-my-tasks">
              <input type="checkbox" checked={myTasksOnly} onChange={(e) => setMyTasksOnly(e.target.checked)} />
              Mine
            </label>
            <button
              className={showArchived ? "int-button" : "int-button-secondary"}
              onClick={() => setShowArchived((v) => !v)}
              title="Show completed tasks older than 14 days"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Archive size={14} strokeWidth={2} />
              {showArchived ? "Hide archived" : "Archived"}
            </button>
            <button className="int-button-secondary" onClick={() => setShowAddFactory(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Building2 size={14} strokeWidth={2} />
              Add Factory
            </button>
          </div>
          <div className="int-bell-wrap">
            <button className="int-bell" onClick={() => setShowNotifications((s) => !s)}>
              <Bell size={18} strokeWidth={2} />
              {unreadCount > 0 && <span className="int-bell-badge">{unreadCount}</span>}
            </button>
            {showNotifications && (
              <>
                <div className="int-bell-backdrop" onClick={() => setShowNotifications(false)} />
                <div className="int-bell-dropdown">
                  <div className="int-bell-dropdown-header">
                    <span>Notifications</span>
                    <button onClick={handleMarkAllRead}>Mark all read</button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="empty">No notifications yet.</p>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div key={n.id} className={`int-bell-item ${n.read ? "" : "unread"} ${n.isMention ? "mention" : ""}`}>
                        {n.isMention && <span className="int-bell-mention-tag">@ Mentioned you</span>}
                        <div>{n.message}</div>
                        <div className="int-bell-time">{new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
          <button className="int-button" onClick={() => setShowNewTask(true)} aria-label="New Task" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={16} strokeWidth={2.5} />
            <span className="btn-label">New Task</span>
          </button>
        </div>
      </div>

      <div className="kanban-mobile-tabs">
        {COLUMNS.map((col) => (
          <button
            key={col.key}
            className={col.key === mobileColumn ? "active" : ""}
            onClick={() => setMobileColumn(col.key)}
          >
            {col.label}
            <span className="kanban-column-count">
              {visibleTasks.filter((t) => t.column === col.key).length}
            </span>
          </button>
        ))}
      </div>

      <div className="kanban-board">
        {COLUMNS.map((col) => {
          const colTasks = visibleTasks
            .filter((t) => t.column === col.key)
            .slice()
            .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
          return (
            <div
              key={col.key}
              ref={(el) => {
                if (el) columnRefs.current[col.key] = el;
              }}
              className={`kanban-column ${drag?.isDragging && drag.overColumn === col.key ? "drag-over" : ""} ${col.key === mobileColumn ? "mobile-active" : ""}`}
            >
              <div className="kanban-column-header">
                <span>{col.label}</span>
                <span className="kanban-column-count">{colTasks.length}</span>
              </div>

              <div className="kanban-column-body">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`kanban-card ${drag?.taskId === task.id && drag.isDragging ? "dragging" : ""} ${task.restricted ? "kanban-card-restricted" : ""}`}
                    data-priority={task.priority}
                    onPointerDown={isMobile ? undefined : (e) => handlePointerDown(e, task)}
                    onPointerMove={isMobile ? undefined : handlePointerMove}
                    onPointerUp={isMobile ? undefined : (e) => handlePointerUp(e, task)}
                    onPointerCancel={isMobile ? undefined : () => setDrag(null)}
                    onClick={isMobile ? () => setDetailTask(task) : undefined}
                  >
                    <span className="kanban-priority-badge" style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}>
                      {task.priority}
                    </span>
                    {task.restricted && (
                      <span className="kanban-restricted-badge" title="Restricted visibility">
                        <Lock size={11} strokeWidth={2.5} />
                      </span>
                    )}
                    {task.organizationName && (
                      <span className="kanban-factory-badge">{task.organizationName}</span>
                    )}
                    {task.region && (
                      <span className="kanban-region-badge">{task.region}</span>
                    )}
                    <div className="kanban-card-title">{task.title}</div>
                    {task.dueDate && (
                      <div className={`kanban-due ${isOverdue(task) ? "overdue" : ""}`}>
                        {isOverdue(task) ? "⚠ Overdue " : "Due "}
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    )}
                    <div className="kanban-card-footer">
                      {task.comments.length > 0 && (
                        <span className="kanban-comment-count">
                          <MessageCircle size={13} strokeWidth={2} />
                          {task.comments.length}
                        </span>
                      )}
                      {task.assignees.length > 0 ? (
                        <div className="kanban-assignee-stack">
                          {task.assignees.map((a) => (
                            <div
                              key={a.accountId}
                              className={`kanban-assignee ${a.role === "LEAD" ? "lead" : "assist"}`}
                              title={`${a.name} — ${a.role === "LEAD" ? "Lead" : "Assist"}`}
                            >
                              <Avatar name={a.name} avatarUrl={a.avatarUrl} size={a.role === "LEAD" ? 28 : 22} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="empty">Unassigned</span>
                      )}
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && <p className="empty kanban-empty">No tasks.</p>}
              </div>
            </div>
          );
        })}
      </div>

      {drag?.isDragging &&
        (() => {
          const draggedTask = tasks.find((t) => t.id === drag.taskId);
          if (!draggedTask) return null;
          return (
            <div
              className="kanban-card kanban-card-ghost"
              style={{ position: "fixed", left: drag.x, top: drag.y, width: drag.width, pointerEvents: "none" }}
            >
              <span className="kanban-priority-badge" style={{ backgroundColor: PRIORITY_COLORS[draggedTask.priority] }}>
                {draggedTask.priority}
              </span>
              <div className="kanban-card-title">{draggedTask.title}</div>
            </div>
          );
        })()}

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          accounts={accounts}
          organizations={organizations}
          canManage={canManage}
          token={token}
          actingAccount={actingAccount}
          onClose={() => setDetailTask(null)}
          onUpdated={handleTaskUpdated}
          onDelete={handleDelete}
        />
      )}

      {showNewTask && (
        <NewTaskModal
          team={team}
          accounts={accounts}
          organizations={organizations}
          canManage={canManage}
          token={token}
          actingAccountId={actingAccount.id}
          onClose={() => setShowNewTask(false)}
          onCreated={(task) => {
            setTasks((prev) => (prev ? [...prev, task] : [task]));
            setShowNewTask(false);
          }}
        />
      )}

      {showAddFactory && (
        <AddFactoryModal
          token={token}
          onClose={() => setShowAddFactory(false)}
          onCreated={(org) => {
            setOrganizations((prev) => [...prev, org]);
            setShowAddFactory(false);
          }}
        />
      )}
    </div>
  );
}

function TaskDetailModal({
  task,
  accounts,
  organizations,
  canManage,
  token,
  actingAccount,
  onClose,
  onUpdated,
  onDelete,
}: {
  task: InternalTask;
  accounts: InternalAccountLite[];
  organizations: FactoryAccount[];
  canManage: boolean;
  token: string;
  actingAccount: InternalAccountLite;
  onClose: () => void;
  onUpdated: (task: InternalTask) => void;
  onDelete: (taskId: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  async function patch(payload: {
    column?: TaskColumn;
    priority?: TaskPriority;
    team?: TaskTeam;
    leadId?: string | null;
    assistIds?: string[];
    dueDate?: string | null;
    organizationId?: string | null;
    restricted?: boolean;
    allowedAccountIds?: string[];
  }) {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateTask(token, task.id, { ...payload, actingAccountId: actingAccount.id });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function postComment() {
    if (!commentText.trim()) return;
    setPostingComment(true);
    setError(null);
    try {
      const updated = await addTaskComment(token, task.id, commentText.trim(), actingAccount.id);
      onUpdated(updated);
      setCommentText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  }

  const timeline = [...task.events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="int-modal-overlay" onClick={onClose}>
      <div className="int-modal int-modal-wide" onClick={(e) => e.stopPropagation()}>
        <button className="int-modal-close" onClick={onClose}>
          ✕
        </button>

        <h2 className="int-modal-title">{task.title}</h2>
        {task.description && <p className="int-modal-description">{renderMentions(task.description, accounts)}</p>}
        {task.restricted && (
          <p className="restricted-notice">
            <Lock size={13} strokeWidth={2} /> Restricted — only you and specifically allowed people can see this task.
          </p>
        )}
        {task.relatedTicketId && <p className="empty">Linked ticket: {task.relatedTicketId}</p>}

        <div className="int-modal-meta">
          Created by {task.createdByName} · {new Date(task.createdAt).toLocaleString()}
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="int-modal-fields">
          <label>
            Column
            <select value={task.column} onChange={(e) => patch({ column: e.target.value as TaskColumn })} disabled={saving}>
              {COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          {canManage ? (
            <>
              <label>
                Priority
                <select value={task.priority} onChange={(e) => patch({ priority: e.target.value as TaskPriority })} disabled={saving}>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Board
                <select value={task.team} onChange={(e) => patch({ team: e.target.value as TaskTeam })} disabled={saving}>
                  {TEAMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <AssigneePicker
                accounts={accounts}
                leadId={task.assignees.find((a) => a.role === "LEAD")?.accountId ?? null}
                assistIds={task.assignees.filter((a) => a.role === "ASSIST").map((a) => a.accountId)}
                disabled={saving}
                onChangeLead={(leadId) => patch({ leadId })}
                onToggleAssist={(accountId) => {
                  const current = task.assignees.filter((a) => a.role === "ASSIST").map((a) => a.accountId);
                  const next = current.includes(accountId) ? current.filter((id) => id !== accountId) : [...current, accountId];
                  patch({ assistIds: next });
                }}
              />

              <label>
                Due date
                <input
                  type="date"
                  value={task.dueDate ?? ""}
                  onChange={(e) => patch({ dueDate: e.target.value || null })}
                  disabled={saving}
                />
              </label>

              <label>
                Factory
                <select
                  value={task.organizationId ?? ""}
                  onChange={(e) => patch({ organizationId: e.target.value || null })}
                  disabled={saving}
                >
                  <option value="">No factory</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>

              <RestrictedVisibilityField
                restricted={task.restricted}
                onToggleRestricted={() => patch({ restricted: !task.restricted, allowedAccountIds: task.allowedAccountIds })}
                allowedAccountIds={task.allowedAccountIds}
                onToggleAllowed={(accountId) => {
                  const next = task.allowedAccountIds.includes(accountId)
                    ? task.allowedAccountIds.filter((id) => id !== accountId)
                    : [...task.allowedAccountIds, accountId];
                  patch({ restricted: true, allowedAccountIds: next });
                }}
                accounts={accounts}
                excludeAccountId={task.createdByAccountId}
                disabled={saving}
              />

              <button className="int-button-danger" onClick={() => onDelete(task.id)}>
                Delete task
              </button>
            </>
          ) : (
            <>
              <div>
                <strong>Priority:</strong> {task.priority}
              </div>
              {task.organizationName && (
                <div>
                  <strong>Factory:</strong> {task.organizationName}
                </div>
              )}
              <div>
                <strong>Lead:</strong> {task.assignees.find((a) => a.role === "LEAD")?.name ?? "Unassigned"}
              </div>
              {task.assignees.some((a) => a.role === "ASSIST") && (
                <div>
                  <strong>Assist:</strong> {task.assignees.filter((a) => a.role === "ASSIST").map((a) => a.name).join(", ")}
                </div>
              )}
              {task.dueDate && (
                <div>
                  <strong>Due:</strong> {new Date(task.dueDate).toLocaleDateString()}
                </div>
              )}
            </>
          )}
        </div>

        <h3 className="int-section-heading">Activity</h3>
        <div className="int-activity-feed">
          {timeline.map((ev) => {
            const EventIcon = EVENT_ICON[ev.type];
            return (
            <div key={ev.id} className="int-activity-item">
              <span><EventIcon size={15} strokeWidth={2} /></span>
              <div>
                <div>{ev.description}</div>
                <div className="int-activity-meta">
                  {ev.authorName} · {new Date(ev.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
            );
          })}
        </div>

        <h3 className="int-section-heading">Comments</h3>
        <div className="int-comments-feed">
          {task.comments.length === 0 && <p className="empty">No comments yet — leave feedback below.</p>}
          {task.comments.map((c) => (
            <div key={c.id} className="int-comment-item">
              <Avatar name={c.authorName} avatarUrl={accounts.find((a) => a.id === c.authorAccountId)?.avatarUrl} size={32} />
              <div>
                <div className="int-comment-author">{c.authorName}</div>
                <div>{renderMentions(c.text, accounts)}</div>
                <div className="int-activity-meta">{new Date(c.createdAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="int-comment-form">
          <MentionAwareField value={commentText} onChange={setCommentText} accounts={accounts} placeholder="Add feedback or an update... (@ to mention someone)" />
          <button className="int-button" onClick={postComment} disabled={postingComment || !commentText.trim()}>
            {postingComment ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewTaskModal({
  team,
  accounts,
  organizations,
  canManage,
  token,
  actingAccountId,
  onClose,
  onCreated,
}: {
  team: TaskTeam;
  accounts: InternalAccountLite[];
  organizations: FactoryAccount[];
  canManage: boolean;
  token: string;
  actingAccountId: string;
  onClose: () => void;
  onCreated: (task: InternalTask) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [assistIds, setAssistIds] = useState<string[]>([]);
  const [column, setColumn] = useState<TaskColumn>("BACKLOG");
  const [dueDate, setDueDate] = useState("");
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [restricted, setRestricted] = useState(false);
  const [allowedAccountIds, setAllowedAccountIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const task = await createTask(token, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        leadId,
        assistIds,
        column,
        team,
        dueDate: dueDate || null,
        organizationId,
        restricted: canManage ? restricted : undefined,
        allowedAccountIds: canManage ? allowedAccountIds : undefined,
        actingAccountId,
      });
      onCreated(task);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="int-modal-overlay" onClick={onClose}>
      <div className="int-modal" onClick={(e) => e.stopPropagation()}>
        <button className="int-modal-close" onClick={onClose}>
          ✕
        </button>
        <h2 className="int-modal-title">New Task</h2>

        <div className="int-modal-fields">
          <label>
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Inspect overlock machine at Chittagong"
            />
          </label>
          <label>
            Description
            <MentionAwareField value={description} onChange={setDescription} accounts={accounts} multiline rows={3} placeholder="@ to mention someone" />
          </label>
          <label>
            Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <AssigneePicker
            accounts={accounts}
            leadId={leadId}
            assistIds={assistIds}
            onChangeLead={setLeadId}
            onToggleAssist={(accountId) =>
              setAssistIds((prev) => (prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]))
            }
          />
          <label>
            Factory (optional)
            <select value={organizationId ?? ""} onChange={(e) => setOrganizationId(e.target.value || null)}>
              <option value="">No factory</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <label>
            Column
            <select value={column} onChange={(e) => setColumn(e.target.value as TaskColumn)}>
              {COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          {canManage && (
            <RestrictedVisibilityField
              restricted={restricted}
              onToggleRestricted={() => setRestricted((v) => !v)}
              allowedAccountIds={allowedAccountIds}
              onToggleAllowed={(accountId) =>
                setAllowedAccountIds((prev) => (prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]))
              }
              accounts={accounts}
              excludeAccountId={actingAccountId}
            />
          )}

          {error && <div className="login-error">{error}</div>}

          <button className="int-button" onClick={handleSubmit} disabled={submitting || !title.trim()}>
            {submitting ? "Creating..." : "Create task"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddFactoryModal({
  token,
  onClose,
  onCreated,
}: {
  token: string;
  onClose: () => void;
  onCreated: (org: FactoryAccount) => void;
}) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [region, setRegion] = useState<string>("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [machineCount, setMachineCount] = useState<string>("");
  const [workerCount, setWorkerCount] = useState<string>("");
  const [buyerBrands, setBuyerBrands] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const org = await createOrganization(token, {
        name: name.trim(),
        location: location.trim() || undefined,
        region: region || undefined,
        contactPerson: contactPerson.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        machineCount: machineCount ? parseInt(machineCount) : undefined,
        workerCount: workerCount ? parseInt(workerCount) : undefined,
        buyerBrands: buyerBrands.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onCreated(org);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create factory");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="int-modal-overlay" onClick={onClose}>
      <div className="int-modal int-modal-wide" onClick={(e) => e.stopPropagation()}>
        <button className="int-modal-close" onClick={onClose}>✕</button>
        <h2 className="int-modal-title">Add Factory</h2>
        <div className="int-modal-fields">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ gridColumn: "1 / -1" }}>
              Factory name <span style={{ color: "#dc2626" }}>*</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Evergreen Garments Ltd" autoFocus />
            </label>
            <label>
              Location
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Ashulia, Dhaka" />
            </label>
            <label>
              Region
              <select value={region} onChange={(e) => setRegion(e.target.value)}>
                <option value="">Select region</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              Contact person (IE / Manager)
              <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="e.g. Ruhul Amin" />
            </label>
            <label>
              Contact phone
              <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="e.g. +8801711000000" />
            </label>
            <label>
              Number of sewing machines
              <input type="number" min={0} value={machineCount} onChange={(e) => setMachineCount(e.target.value)} placeholder="e.g. 120" />
            </label>
            <label>
              Number of workers
              <input type="number" min={0} value={workerCount} onChange={(e) => setWorkerCount(e.target.value)} placeholder="e.g. 450" />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Buyer brands (comma-separated)
              <input type="text" value={buyerBrands} onChange={(e) => setBuyerBrands(e.target.value)} placeholder="e.g. H&M, Primark, Zara" />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Internal notes
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Long-term client, prefers WhatsApp contact" />
            </label>
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="int-button" onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting ? "Adding..." : "Add factory"}
          </button>
        </div>
      </div>
    </div>
  );
}

// One Lead (owns the task, like a striker) plus any number of Assists (like
// a teammate setting up the goal) — built so jobs that need different skill
// sets can pull in the right people, each getting credit for their part.
function AssigneePicker({
  accounts,
  leadId,
  assistIds,
  disabled,
  onChangeLead,
  onToggleAssist,
}: {
  accounts: InternalAccountLite[];
  leadId: string | null;
  assistIds: string[];
  disabled?: boolean;
  onChangeLead: (leadId: string | null) => void;
  onToggleAssist: (accountId: string) => void;
}) {
  const assistCandidates = accounts.filter((a) => a.id !== leadId);

  return (
    <div className="assignee-picker">
      <label>
        Lead
        <select value={leadId ?? ""} onChange={(e) => onChangeLead(e.target.value || null)} disabled={disabled}>
          <option value="">Unassigned</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      <div>
        <span className="assignee-picker-assists-label">Assists</span>
        <div className="assist-chip-list">
          {assistCandidates.length === 0 ? (
            <p className="empty">No one else to add yet.</p>
          ) : (
            assistCandidates.map((a) => {
              const active = assistIds.includes(a.id);
              return (
                <label key={a.id} className={`assist-chip ${active ? "active" : ""}`}>
                  <input type="checkbox" checked={active} onChange={() => onToggleAssist(a.id)} disabled={disabled} hidden />
                  <Avatar name={a.name} avatarUrl={a.avatarUrl} size={20} />
                  <span>{a.name}</span>
                  {a.skills && a.skills.length > 0 && <span className="assist-chip-skills">{a.skills.join(", ")}</span>}
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
