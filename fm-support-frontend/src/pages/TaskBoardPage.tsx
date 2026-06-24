import { useEffect, useState } from "react";
import {
  addTaskComment,
  createTask,
  deleteTask,
  fetchInternalAccounts,
  fetchTaskNotifications,
  fetchTasks,
  markAllTaskNotificationsRead,
  updateTask,
  UnauthorizedError,
} from "../api";
import type { InternalAccountLite, InternalNotification, InternalTask, TaskColumn, TaskEventType, TaskPriority } from "../types";

const COLUMNS: { key: TaskColumn; label: string }[] = [
  { key: "BACKLOG", label: "Backlog" },
  { key: "PENDING", label: "Pending" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
];

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const PRIORITY_RANK: Record<TaskPriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "#6b7280",
  MEDIUM: "#2563eb",
  HIGH: "#d97706",
  URGENT: "#dc2626",
};

const EVENT_ICON: Record<TaskEventType, string> = {
  CREATED: "🆕",
  MOVED: "🔄",
  PRIORITY_CHANGED: "⚡",
  ASSIGNED: "👤",
  DUE_DATE_CHANGED: "📅",
};

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function isOverdue(task: InternalTask): boolean {
  if (!task.dueDate || task.column === "COMPLETED") return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

export default function TaskBoardPage({
  token,
  actingAccount,
  onUnauthorized,
}: {
  token: string;
  actingAccount: InternalAccountLite;
  onUnauthorized: () => void;
}) {
  const [tasks, setTasks] = useState<InternalTask[] | null>(null);
  const [accounts, setAccounts] = useState<InternalAccountLite[]>([]);
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<InternalTask | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [myTasksOnly, setMyTasksOnly] = useState(false);

  const canManage = actingAccount.role === "MANAGER" || actingAccount.role === "ADMIN";
  const unreadCount = notifications.filter((n) => !n.read).length;

  function load() {
    Promise.all([fetchTasks(token), fetchInternalAccounts(token)])
      .then(([t, a]) => {
        setTasks(t);
        setAccounts(a);
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) return onUnauthorized();
        setError(err.message);
      });
  }

  function loadNotifications() {
    if (!canManage) return;
    fetchTaskNotifications(token)
      .then(setNotifications)
      .catch(() => {});
  }

  useEffect(load, [token]);
  useEffect(loadNotifications, [token, canManage]);

  async function handleDrop(column: TaskColumn) {
    if (!draggingId) return;
    const taskId = draggingId;
    setDraggingId(null);
    try {
      const updated = await updateTask(token, taskId, { column, actingAccountId: actingAccount.id });
      setTasks((prev) => prev?.map((t) => (t.id === taskId ? updated : t)) ?? prev);
      loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move task");
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
    await markAllTaskNotificationsRead(token).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  if (error) return <div className="page-error">{error}</div>;
  if (!tasks) return <div className="page-loading">Loading task board...</div>;

  const visibleTasks = myTasksOnly ? tasks.filter((t) => t.assigneeId === actingAccount.id) : tasks;

  return (
    <div className="kanban-page">
      <div className="kanban-toolbar">
        <p className="empty">
          {canManage
            ? "Anyone can drag cards between columns. Click a card to comment, or edit priority/assignee here."
            : "Drag cards between columns, or click one to leave a comment."}
        </p>
        <div className="kanban-toolbar-actions">
          <label className="kanban-my-tasks">
            <input type="checkbox" checked={myTasksOnly} onChange={(e) => setMyTasksOnly(e.target.checked)} />
            My tasks
          </label>
          {canManage && (
            <div className="int-bell-wrap">
              <button className="int-bell" onClick={() => setShowNotifications((s) => !s)}>
                🔔{unreadCount > 0 && <span className="int-bell-badge">{unreadCount}</span>}
              </button>
              {showNotifications && (
                <div className="int-bell-dropdown">
                  <div className="int-bell-dropdown-header">
                    <span>Notifications</span>
                    <button onClick={handleMarkAllRead}>Mark all read</button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="empty">No notifications yet.</p>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div key={n.id} className={`int-bell-item ${n.read ? "" : "unread"}`}>
                        <div>{n.message}</div>
                        <div className="int-bell-time">{new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          {canManage && (
            <button className="int-button" onClick={() => setShowNewTask(true)}>
              + New Task
            </button>
          )}
        </div>
      </div>

      <div className="kanban-board">
        {COLUMNS.map((col) => {
          const colTasks = visibleTasks
            .filter((t) => t.column === col.key)
            .slice()
            .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
          return (
            <div key={col.key} className="kanban-column" onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(col.key)}>
              <div className="kanban-column-header">
                <span>{col.label}</span>
                <span className="kanban-column-count">{colTasks.length}</span>
              </div>

              <div className="kanban-column-body">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`kanban-card ${draggingId === task.id ? "dragging" : ""}`}
                    draggable
                    onDragStart={() => setDraggingId(task.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => setDetailTask(task)}
                  >
                    <span className="kanban-priority-badge" style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}>
                      {task.priority}
                    </span>
                    <div className="kanban-card-title">{task.title}</div>
                    {task.dueDate && (
                      <div className={`kanban-due ${isOverdue(task) ? "overdue" : ""}`}>
                        {isOverdue(task) ? "⚠ Overdue " : "Due "}
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    )}
                    <div className="kanban-card-footer">
                      {task.comments.length > 0 && <span className="kanban-comment-count">💬 {task.comments.length}</span>}
                      {task.assigneeName ? (
                        <span className="kanban-avatar" title={task.assigneeName}>
                          {initials(task.assigneeName)}
                        </span>
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

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          accounts={accounts}
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
          accounts={accounts}
          token={token}
          actingAccountId={actingAccount.id}
          onClose={() => setShowNewTask(false)}
          onCreated={(task) => {
            setTasks((prev) => (prev ? [...prev, task] : [task]));
            setShowNewTask(false);
          }}
        />
      )}
    </div>
  );
}

function TaskDetailModal({
  task,
  accounts,
  canManage,
  token,
  actingAccount,
  onClose,
  onUpdated,
  onDelete,
}: {
  task: InternalTask;
  accounts: InternalAccountLite[];
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
    assigneeId?: string | null;
    dueDate?: string | null;
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
        {task.description && <p className="int-modal-description">{task.description}</p>}
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
                Assignee
                <select
                  value={task.assigneeId ?? ""}
                  onChange={(e) => patch({ assigneeId: e.target.value || null })}
                  disabled={saving}
                >
                  <option value="">Unassigned</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Due date
                <input
                  type="date"
                  value={task.dueDate ?? ""}
                  onChange={(e) => patch({ dueDate: e.target.value || null })}
                  disabled={saving}
                />
              </label>

              <button className="int-button-danger" onClick={() => onDelete(task.id)}>
                Delete task
              </button>
            </>
          ) : (
            <>
              <div>
                <strong>Priority:</strong> {task.priority}
              </div>
              <div>
                <strong>Assignee:</strong> {task.assigneeName ?? "Unassigned"}
              </div>
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
          {timeline.map((ev) => (
            <div key={ev.id} className="int-activity-item">
              <span>{EVENT_ICON[ev.type]}</span>
              <div>
                <div>{ev.description}</div>
                <div className="int-activity-meta">
                  {ev.authorName} · {new Date(ev.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        <h3 className="int-section-heading">Comments</h3>
        <div className="int-comments-feed">
          {task.comments.length === 0 && <p className="empty">No comments yet — leave feedback below.</p>}
          {task.comments.map((c) => (
            <div key={c.id} className="int-comment-item">
              <span className="kanban-avatar">{initials(c.authorName)}</span>
              <div>
                <div className="int-comment-author">{c.authorName}</div>
                <div>{c.text}</div>
                <div className="int-activity-meta">{new Date(c.createdAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="int-comment-form">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add feedback or an update..."
          />
          <button className="int-button" onClick={postComment} disabled={postingComment || !commentText.trim()}>
            {postingComment ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewTaskModal({
  accounts,
  token,
  actingAccountId,
  onClose,
  onCreated,
}: {
  accounts: InternalAccountLite[];
  token: string;
  actingAccountId: string;
  onClose: () => void;
  onCreated: (task: InternalTask) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [column, setColumn] = useState<TaskColumn>("BACKLOG");
  const [dueDate, setDueDate] = useState("");
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
        assigneeId: assigneeId || null,
        column,
        dueDate: dueDate || null,
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
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
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
          <label>
            Assignee
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Unassigned</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
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

          {error && <div className="login-error">{error}</div>}

          <button className="int-button" onClick={handleSubmit} disabled={submitting || !title.trim()}>
            {submitting ? "Creating..." : "Create task"}
          </button>
        </div>
      </div>
    </div>
  );
}
