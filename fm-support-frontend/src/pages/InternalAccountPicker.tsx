import { useEffect, useState } from "react";
import { fetchInternalAccounts } from "../api";
import type { InternalAccountLite } from "../types";

export default function InternalAccountPicker({
  token,
  onPick,
}: {
  token: string;
  onPick: (account: InternalAccountLite) => void;
}) {
  const [accounts, setAccounts] = useState<InternalAccountLite[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInternalAccounts(token)
      .then(setAccounts)
      .catch((err) => setError(err.message));
  }, [token]);

  return (
    <div className="int-picker-page">
      <div className="int-picker-card">
        <div className="int-logo-badge">
          <img src="/public/logo/No_BG.png" alt="FM" />
        </div>
        <h1>FM Support — Internal</h1>
        <p className="subtitle">Continue as a team member to see the dashboard from their view</p>

        {error && <div className="login-error">{error}</div>}

        <div className="int-picker-grid">
          {accounts.map((account) => (
            <button key={account.id} className="int-picker-option" onClick={() => onPick(account)}>
              <span className="int-picker-option-name">{account.name}</span>
              <span className={`int-role-badge int-role-${account.role.toLowerCase()}`}>{account.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
