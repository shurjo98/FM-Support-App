import { useEffect, useState } from "react";
import { fetchInternalAccounts } from "../api";
import type { InternalAccountLite } from "../types";
import { Avatar } from "../Avatar";
import { RoleBadges } from "../RoleBadges";

export default function InternalAccountPicker({
  token,
  onPick,
}: {
  token: string;
  onPick: (account: InternalAccountLite) => void;
}) {
  const [accounts, setAccounts] = useState<InternalAccountLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchInternalAccounts(token)
      .then(setAccounts)
      .catch((err) => setError(err.message));
  }, [token]);

  const visibleAccounts = accounts.filter((a) => a.name.toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <div className="int-picker-page">
      <div className="int-picker-card">
        <div className="int-logo-badge">
          <img src="/public/logo/No_BG.png" alt="FM" />
        </div>
        <h1>FM Support — Internal</h1>
        <p className="subtitle">Continue as a team member to see the dashboard from their view</p>

        {error && <div className="login-error">{error}</div>}

        {accounts.length > 6 && (
          <input
            type="text"
            className="int-picker-filter"
            placeholder="Search by name..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoFocus
          />
        )}

        <div className="int-picker-grid">
          {visibleAccounts.length === 0 && <p className="empty">No matching team member.</p>}
          {visibleAccounts.map((account) => (
            <button key={account.id} className="int-picker-option" onClick={() => onPick(account)}>
              <span className="int-picker-option-left">
                <Avatar name={account.name} avatarUrl={account.avatarUrl} size={40} />
                <span className="int-picker-option-name">{account.name}</span>
              </span>
              <span className="role-badges-list int-picker-option-roles">
                <RoleBadges roles={account.roles} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
