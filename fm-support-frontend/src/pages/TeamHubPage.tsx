import { useEffect, useState } from "react";
import {
  createTeamGoal,
  deleteTeamGoal,
  fetchInternalAccounts,
  fetchTasks,
  fetchTeamGoals,
  updateTeamGoal,
  uploadAvatar,
  UnauthorizedError,
} from "../api";
import type { InternalAccountLite, InternalTask, TeamGoal } from "../types";
import { Avatar } from "../Avatar";
import { enablePushNotifications, isPushSupported } from "../push";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function TeamHubPage({
  token,
  actingAccount,
  onAccountUpdated,
  onUnauthorized,
}: {
  token: string;
  actingAccount: InternalAccountLite;
  onAccountUpdated: (account: InternalAccountLite) => void;
  onUnauthorized: () => void;
}) {
  const [accounts, setAccounts] = useState<InternalAccountLite[]>([]);
  const [tasks, setTasks] = useState<InternalTask[]>([]);
  const [goals, setGoals] = useState<TeamGoal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [enablingPush, setEnablingPush] = useState(false);

  const canManage = actingAccount.role === "MANAGER" || actingAccount.role === "ADMIN";

  function load() {
    Promise.all([fetchInternalAccounts(token), fetchTasks(token), fetchTeamGoals()])
      .then(([a, t, g]) => {
        setAccounts(a);
        setGoals(g);
        setTasks(t);
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) return onUnauthorized();
        setError(err.message);
      });
  }

  useEffect(load, [token]);

  async function handleAvatarChange(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const updated = await uploadAvatar(actingAccount.id, file);
      onAccountUpdated(updated);
      setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  async function handleEnablePush() {
    setEnablingPush(true);
    setPushStatus(null);
    try {
      const result = await enablePushNotifications(actingAccount.id);
      setPushStatus(result.message);
    } catch (err) {
      setPushStatus(err instanceof Error ? err.message : "Failed to enable notifications");
    } finally {
      setEnablingPush(false);
    }
  }

  async function handleDeleteGoal(id: string) {
    try {
      await deleteTeamGoal(id, actingAccount.id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete goal");
    }
  }

  if (error) return <div className="page-error">{error}</div>;

  const myCompleted = tasks.filter((t) => t.assigneeId === actingAccount.id && t.column === "COMPLETED");
  const myCompletedThisWeek = myCompleted.filter((t) => Date.now() - new Date(t.updatedAt).getTime() < ONE_WEEK_MS);
  const myAssignedOpen = tasks.filter((t) => t.assigneeId === actingAccount.id && t.column !== "COMPLETED");
  const myComments = tasks.reduce((sum, t) => sum + t.comments.filter((c) => c.authorAccountId === actingAccount.id).length, 0);

  const leaderboard = accounts
    .map((a) => ({
      account: a,
      completedCount: tasks.filter((t) => t.assigneeId === a.id && t.column === "COMPLETED").length,
    }))
    .filter((row) => row.completedCount > 0)
    .sort((a, b) => b.completedCount - a.completedCount)
    .slice(0, 8);

  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <div className="team-hub">
      <div className="team-hub-grid">
        <div className="int-modal-fields team-hub-card">
          <h2 className="int-section-heading">My Profile</h2>
          <div className="team-profile-row">
            <Avatar name={actingAccount.name} avatarUrl={actingAccount.avatarUrl} size={72} />
            <div>
              <div className="team-profile-name">{actingAccount.name}</div>
              <span className={`int-role-badge int-role-${actingAccount.role.toLowerCase()}`}>{actingAccount.role}</span>
              <label className="int-button-secondary team-avatar-upload">
                {uploading ? "Uploading..." : "Change photo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
                  disabled={uploading}
                  hidden
                />
              </label>
              {isPushSupported() && (
                <button className="int-button-secondary team-avatar-upload" onClick={handleEnablePush} disabled={enablingPush}>
                  {enablingPush ? "Enabling..." : "🔔 Enable mobile notifications"}
                </button>
              )}
            </div>
          </div>
          {pushStatus && <p className="empty" style={{ marginBottom: 12 }}>{pushStatus}</p>}

          <div className="team-stat-row">
            <div className="team-stat">
              <div className="team-stat-value">{myCompletedThisWeek.length}</div>
              <div className="team-stat-label">Completed this week</div>
            </div>
            <div className="team-stat">
              <div className="team-stat-value">{myCompleted.length}</div>
              <div className="team-stat-label">Completed all-time</div>
            </div>
            <div className="team-stat">
              <div className="team-stat-value">{myAssignedOpen.length}</div>
              <div className="team-stat-label">Currently assigned</div>
            </div>
            <div className="team-stat">
              <div className="team-stat-value">{myComments}</div>
              <div className="team-stat-label">Comments posted</div>
            </div>
          </div>
          {myCompletedThisWeek.length > 0 && (
            <p className="team-cheer">🎉 Nice work — {myCompletedThisWeek.length} task{myCompletedThisWeek.length > 1 ? "s" : ""} closed out this week!</p>
          )}
        </div>

        <div className="int-modal-fields team-hub-card">
          <h2 className="int-section-heading">🏆 Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <p className="empty">No completed tasks yet — finish one to get on the board!</p>
          ) : (
            <div className="leaderboard-list">
              {leaderboard.map((row, i) => (
                <div key={row.account.id} className={`leaderboard-row ${row.account.id === actingAccount.id ? "me" : ""}`}>
                  <span className="leaderboard-rank">{MEDALS[i] ?? `#${i + 1}`}</span>
                  <Avatar name={row.account.name} avatarUrl={row.account.avatarUrl} size={32} />
                  <span className="leaderboard-name">{row.account.name}</span>
                  <span className="leaderboard-count">{row.completedCount} done</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="int-modal-fields team-hub-card team-vision-card">
        <div className="kanban-toolbar">
          <h2 className="int-section-heading" style={{ margin: 0 }}>
            🎯 Team Vision — where we're headed together
          </h2>
          {canManage && (
            <button className="int-button" onClick={() => setShowNewGoal(true)}>
              + Add Goal
            </button>
          )}
        </div>

        {goals.length === 0 ? (
          <p className="empty">
            {canManage
              ? "No goals set yet — add the team's first target (a sales number, tickets resolved, anything that gives everyone something to aim for)."
              : "No goals set yet. Check back soon."}
          </p>
        ) : (
          <div className="goal-list">
            {goals.map((goal) => (
              <GoalRow key={goal.id} goal={goal} canManage={canManage} actingAccountId={actingAccount.id} onDelete={handleDeleteGoal} onUpdated={(g) => setGoals((prev) => prev.map((x) => (x.id === g.id ? g : x)))} />
            ))}
          </div>
        )}
      </div>

      {showNewGoal && (
        <NewGoalModal
          actingAccountId={actingAccount.id}
          onClose={() => setShowNewGoal(false)}
          onCreated={(goal) => {
            setGoals((prev) => [...prev, goal]);
            setShowNewGoal(false);
          }}
        />
      )}
    </div>
  );
}

function GoalRow({
  goal,
  canManage,
  actingAccountId,
  onDelete,
  onUpdated,
}: {
  goal: TeamGoal;
  canManage: boolean;
  actingAccountId: string;
  onDelete: (id: string) => void;
  onUpdated: (goal: TeamGoal) => void;
}) {
  const [editingValue, setEditingValue] = useState(false);
  const [value, setValue] = useState(String(goal.currentValue));
  const pct = Math.max(0, Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)));

  async function saveValue() {
    const num = Number(value);
    setEditingValue(false);
    if (Number.isNaN(num) || num === goal.currentValue) return;
    try {
      const updated = await updateTeamGoal(goal.id, { currentValue: num, actingAccountId });
      onUpdated(updated);
    } catch {
      // swallow — leave UI as-is, value will revert visually on next load
    }
  }

  return (
    <div className="goal-row">
      <div className="goal-row-header">
        <div>
          <div className="goal-title">{goal.title}</div>
          {goal.description && <div className="goal-description">{goal.description}</div>}
        </div>
        {canManage && (
          <button className="int-button-danger" onClick={() => onDelete(goal.id)}>
            Remove
          </button>
        )}
      </div>
      <div className="goal-progress-track">
        <div className="goal-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="goal-progress-meta">
        {canManage && editingValue ? (
          <input
            type="number"
            className="goal-value-input"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={saveValue}
            onKeyDown={(e) => e.key === "Enter" && saveValue()}
          />
        ) : (
          <span onClick={() => canManage && setEditingValue(true)} className={canManage ? "goal-value-editable" : ""}>
            {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit}
          </span>
        )}
        <span>{pct}%</span>
      </div>
    </div>
  );
}

function NewGoalModal({
  actingAccountId,
  onClose,
  onCreated,
}: {
  actingAccountId: string;
  onClose: () => void;
  onCreated: (goal: TeamGoal) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [currentValue, setCurrentValue] = useState("0");
  const [unit, setUnit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const target = Number(targetValue);
    if (!title.trim() || !unit.trim() || !target) return;
    setSubmitting(true);
    setError(null);
    try {
      const goal = await createTeamGoal({
        title: title.trim(),
        description: description.trim() || undefined,
        targetValue: target,
        currentValue: Number(currentValue) || 0,
        unit: unit.trim(),
        actingAccountId,
      });
      onCreated(goal);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create goal");
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
        <h2 className="int-modal-title">New Team Goal</h2>
        <div className="int-modal-fields">
          <label>
            Title
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Q3 Machines Sold" />
          </label>
          <label>
            Description
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short line of context" />
          </label>
          <label>
            Target
            <input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="500" />
          </label>
          <label>
            Current progress
            <input type="number" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} />
          </label>
          <label>
            Unit
            <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="machines, tickets, units..." />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button className="int-button" onClick={handleSubmit} disabled={submitting || !title.trim() || !unit.trim() || !targetValue}>
            {submitting ? "Saving..." : "Add goal"}
          </button>
        </div>
      </div>
    </div>
  );
}
