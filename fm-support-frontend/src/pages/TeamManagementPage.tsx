import { useEffect, useState } from "react";
import {
  createInternalAccount,
  deleteInternalAccount,
  fetchInternalAccounts,
  updateInternalAccount,
  uploadAvatar,
  UnauthorizedError,
} from "../api";
import type { InternalAccountLite, InternalRole } from "../types";
import { Avatar } from "../Avatar";

const ROLES: InternalRole[] = ["TECHNICIAN", "MANAGER", "ADMIN"];

// Business function(s) a person covers — separate from Role (which is the
// permission level above). Multi-select since someone often wears more than
// one hat, e.g. Stock Maintenance + After-Sales Support.
const DEPARTMENTS = [
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

// Existing names follow a "First Name (Designation)" convention, e.g.
// "Hares (Senior Mechanic)" — split/combine so the form can edit the two
// parts separately without changing how names are stored or displayed.
function splitNameTitle(name: string): { name: string; title: string } {
  const match = name.match(/^(.*?)\s*\((.*)\)\s*$/);
  return match ? { name: match[1] ?? "", title: match[2] ?? "" } : { name, title: "" };
}

function combineNameTitle(name: string, title: string): string {
  const trimmedName = name.trim();
  const trimmedTitle = title.trim();
  return trimmedTitle ? `${trimmedName} (${trimmedTitle})` : trimmedName;
}

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
          Add or remove team members, change their name, designation, role, department(s), or photo.
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
              <div className="team-roster-departments">
                {(account.departments ?? []).map((d) => (
                  <span key={d} className="dept-badge">
                    {d}
                  </span>
                ))}
              </div>
              <span className={`int-role-badge int-role-${account.role.toLowerCase()}`}>{account.role}</span>
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
  const split = existing ? splitNameTitle(existing.name) : { name: "", title: "" };
  const [name, setName] = useState(split.name);
  const [title, setTitle] = useState(split.title);
  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<InternalRole>(existing?.role ?? "TECHNICIAN");
  const [skillsText, setSkillsText] = useState(existing?.skills?.join(", ") ?? "");
  const [departments, setDepartments] = useState<string[]>(existing?.departments ?? []);
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(existing);

  async function handleSubmit() {
    const fullName = combineNameTitle(name, title);
    if (!fullName.trim()) return;
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
          name: fullName,
          role,
          skills,
          departments,
          ...(accountId.trim() ? { accountId: accountId.trim() } : {}),
          ...(password.trim() ? { password: password.trim() } : {}),
          actingAccountId,
        });
      } else {
        account = await createInternalAccount(token, {
          name: fullName,
          accountId: accountId.trim(),
          password: password.trim(),
          role,
          skills,
          departments,
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
            <Avatar name={fullPreviewName(name, title)} avatarUrl={existing?.avatarUrl} size={56} />
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
          <label>
            Designation (optional)
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Mechanic, Marketing, Manager"
            />
          </label>
          <label>
            Skills (comma-separated, optional)
            <input
              type="text"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="e.g. electrical, customer comms, stitching"
            />
          </label>
          <div>
            <span className="assignee-picker-assists-label">
              Department(s) — someone can cover more than one (e.g. Stock Maintenance + After-Sales Support)
            </span>
            <div className="assist-chip-list">
              {DEPARTMENTS.map((d) => {
                const active = departments.includes(d);
                return (
                  <label key={d} className={`assist-chip ${active ? "active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() =>
                        setDepartments((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
                      }
                      hidden
                    />
                    <span>{d}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <label>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value as InternalRole)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
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
            disabled={submitting || !name.trim() || (!isEdit && (!accountId.trim() || !password.trim()))}
          >
            {submitting ? "Saving..." : isEdit ? "Save changes" : "Add member"}
          </button>
        </div>
      </div>
    </div>
  );
}

function fullPreviewName(name: string, title: string): string {
  return combineNameTitle(name || "?", title) || "?";
}
