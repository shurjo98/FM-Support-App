import { useEffect, useState } from "react";
import {
  createInternalAccount,
  deleteInternalAccount,
  fetchInternalAccounts,
  updateInternalAccount,
  uploadAvatar,
  UnauthorizedError,
} from "../api";
import type { InternalAccountLite } from "../types";
import { Avatar } from "../Avatar";
import { RoleBadges } from "../RoleBadges";

// Role *is* the designation — one multi-select field instead of two. A
// curated list covering both permission levels and the business functions a
// sales & distribution company typically has, plus the option to type in
// anything else. Someone can hold several at once (e.g. Technician +
// Marketing, or Stock Maintenance + After-Sales Support).
const PRESET_ROLES = [
  "Technician",
  "Manager",
  "Admin",
  "Sales",
  "Commercial",
  "Marketing",
  "Branding",
  "Digital Marketing",
  "Stock Maintenance",
  "After-Sales Support",
  "Customer Service",
  "Logistics & Distribution",
  "Finance & Accounts",
  "Human Resources",
  "Procurement",
];

export default function TeamManagementPage({
  token,
  actingAccount,
  onUnauthorized,
}: {
  token: string;
  actingAccount: InternalAccountLite;
  onUnauthorized: () => void;
}) {
  const [accounts, setAccounts] = useState<InternalAccountLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<InternalAccountLite | null>(null);

  function load() {
    fetchInternalAccounts(token)
      .then(setAccounts)
      .catch((err) => {
        if (err instanceof UnauthorizedError) return onUnauthorized();
        setError(err.message);
      });
  }

  useEffect(load, [token]);

  async function handleDelete(account: InternalAccountLite) {
    if (!window.confirm(`Remove ${account.name}? They'll lose access immediately. This can't be undone.`)) return;
    try {
      await deleteInternalAccount(token, account.id, actingAccount.id);
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove team member");
    }
  }

  if (error) return <div className="page-error">{error}</div>;

  return (
    <div>
      <div className="kanban-toolbar">
        <p className="empty" style={{ margin: 0 }}>
          Add or remove team members, change their name, role(s), or photo.
        </p>
        <button className="int-button" onClick={() => setShowAdd(true)}>
          + Add member
        </button>
      </div>

      <div className="int-modal-fields team-hub-card">
        <div className="team-roster-list">
          {accounts.map((account) => (
            <div key={account.id} className="team-roster-row">
              <Avatar name={account.name} avatarUrl={account.avatarUrl} size={40} />
              <div className="team-roster-name">
                {account.name}
                {account.skills && account.skills.length > 0 && (
                  <div className="team-roster-skills">{account.skills.join(" · ")}</div>
                )}
              </div>
              <span className="role-badges-list team-roster-roles">
                <RoleBadges roles={account.roles} />
              </span>
              <div className="team-roster-actions">
                <button className="int-button-secondary" onClick={() => setEditing(account)}>
                  Edit
                </button>
                <button className="int-button-danger" onClick={() => handleDelete(account)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAdd && (
        <MemberModal
          token={token}
          actingAccountId={actingAccount.id}
          onClose={() => setShowAdd(false)}
          onSaved={(account) => {
            setAccounts((prev) => [...prev, account]);
            setShowAdd(false);
          }}
        />
      )}

      {editing && (
        <MemberModal
          token={token}
          actingAccountId={actingAccount.id}
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={(account) => {
            setAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function MemberModal({
  token,
  actingAccountId,
  existing,
  onClose,
  onSaved,
}: {
  token: string;
  actingAccountId: string;
  existing?: InternalAccountLite;
  onClose: () => void;
  onSaved: (account: InternalAccountLite) => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<string[]>(existing?.roles ?? []);
  const [customRoleText, setCustomRoleText] = useState("");
  const [skillsText, setSkillsText] = useState(existing?.skills?.join(", ") ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(existing);

  function toggleRole(role: string) {
    setRoles((prev) =>
      prev.some((r) => r.toLowerCase() === role.toLowerCase())
        ? prev.filter((r) => r.toLowerCase() !== role.toLowerCase())
        : [...prev, role]
    );
  }

  function addCustomRole() {
    const value = customRoleText.trim();
    if (!value) return;
    if (!roles.some((r) => r.toLowerCase() === value.toLowerCase())) {
      setRoles((prev) => [...prev, value]);
    }
    setCustomRoleText("");
  }

  // Preset chips first, then any custom roles already on this person that
  // aren't part of the preset list — so they stay visible/removable.
  const extraRoles = roles.filter((r) => !PRESET_ROLES.some((p) => p.toLowerCase() === r.toLowerCase()));
  const chipOptions = [...PRESET_ROLES, ...extraRoles];

  async function handleSubmit() {
    if (!name.trim() || roles.length === 0) return;
    if (!isEdit && (!accountId.trim() || !password.trim())) return;

    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setSubmitting(true);
    setError(null);
    try {
      let account: InternalAccountLite;
      if (isEdit && existing) {
        account = await updateInternalAccount(token, existing.id, {
          name: name.trim(),
          roles,
          skills,
          ...(accountId.trim() ? { accountId: accountId.trim() } : {}),
          ...(password.trim() ? { password: password.trim() } : {}),
          actingAccountId,
        });
      } else {
        account = await createInternalAccount(token, {
          name: name.trim(),
          accountId: accountId.trim(),
          password: password.trim(),
          roles,
          skills,
          actingAccountId,
        });
      }

      if (photo) {
        account = await uploadAvatar(token, account.id, photo);
      }

      onSaved(account);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save team member");
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
        <h2 className="int-modal-title">{isEdit ? "Edit team member" : "Add a team member"}</h2>
        <div className="int-modal-fields">
          <div className="team-profile-row" style={{ marginBottom: 4 }}>
            <Avatar name={name || "?"} avatarUrl={existing?.avatarUrl} size={56} />
            <label className="int-button-secondary team-avatar-upload">
              {photo ? photo.name : "Choose photo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                hidden
              />
            </label>
          </div>

          <label>
            Name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rashed" />
          </label>

          <div>
            <span className="assignee-picker-assists-label">
              Role(s) — pick any that apply, or type your own below. Someone can hold more than one (e.g.
              Technician + Marketing).
            </span>
            <div className="assist-chip-list">
              {chipOptions.map((r) => {
                const active = roles.some((x) => x.toLowerCase() === r.toLowerCase());
                return (
                  <label key={r} className={`assist-chip ${active ? "active" : ""}`}>
                    <input type="checkbox" checked={active} onChange={() => toggleRole(r)} hidden />
                    <span>{r}</span>
                  </label>
                );
              })}
            </div>
            <div className="custom-role-add">
              <input
                type="text"
                value={customRoleText}
                onChange={(e) => setCustomRoleText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomRole();
                  }
                }}
                placeholder="Type a custom role and press Enter"
              />
              <button type="button" className="int-button-secondary" onClick={addCustomRole} disabled={!customRoleText.trim()}>
                Add
              </button>
            </div>
          </div>

          <label>
            Skills (comma-separated, optional)
            <input
              type="text"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="e.g. electrical, customer comms, stitching"
            />
          </label>
          <label>
            Login ID {isEdit && <span style={{ fontWeight: 400, color: "#9ca3af" }}>(leave blank to keep current)</span>}
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder={isEdit ? "unchanged" : "e.g. rashed.tech"}
            />
          </label>
          <label>
            Password {isEdit && <span style={{ fontWeight: 400, color: "#9ca3af" }}>(leave blank to keep current)</span>}
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? "unchanged" : "e.g. fm12345"}
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button
            className="int-button"
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || roles.length === 0 || (!isEdit && (!accountId.trim() || !password.trim()))}
          >
            {submitting ? "Saving..." : isEdit ? "Save changes" : "Add member"}
          </button>
        </div>
      </div>
    </div>
  );
}
