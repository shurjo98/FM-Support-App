import { useEffect, useState } from "react";
import { fetchCustomerUsers } from "../api";
import type { CustomerUser } from "../types";

export default function AccountPickerPage({ onPick }: { onPick: (user: CustomerUser) => void }) {
  const [users, setUsers] = useState<CustomerUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomerUsers()
      .then(setUsers)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="cust-picker-page">
      <div className="cust-logo-badge" style={{ width: 48, height: 48, fontSize: "1rem" }}>
        FM
      </div>
      <h1 style={{ margin: "16px 0 4px" }}>FM Factory Support</h1>
      <p style={{ opacity: 0.7, fontSize: "0.9rem" }}>
        Continue as a registered operator or IE (Industrial Engineer). Only IEs can raise issues.
      </p>

      {error && <div className="cust-error">{error}</div>}

      <div className="cust-picker-grid">
        {users.map((user) => (
          <div
            key={user.id}
            className="cust-card cust-card-clickable cust-picker-card"
            onClick={() => onPick(user)}
          >
            <div className="cust-picker-card-name">
              {user.name} <span className="cust-role-badge">{user.role}</span>
            </div>
            <div className="cust-picker-card-org">{user.organizationName}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
