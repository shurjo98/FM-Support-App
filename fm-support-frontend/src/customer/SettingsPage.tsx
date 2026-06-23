import type { CustomerUser } from "../types";

export default function SettingsPage({
  user,
  onSwitchAccount,
}: {
  user: CustomerUser;
  onSwitchAccount: () => void;
}) {
  return (
    <div className="cust-card" style={{ maxWidth: 480 }}>
      <div className="cust-settings-row">
        <span className="cust-settings-label">Name</span>
        <span className="cust-settings-value">{user.name}</span>
      </div>
      <div className="cust-settings-row">
        <span className="cust-settings-label">Factory</span>
        <span className="cust-settings-value">{user.organizationName}</span>
      </div>
      <div className="cust-settings-row">
        <span className="cust-settings-label">Role</span>
        <span className="cust-settings-value">
          {user.role === "IE" ? "Industrial Engineer (IE)" : "Operator"}
        </span>
      </div>
      <div className="cust-settings-row">
        <span className="cust-settings-label">Account</span>
        <button className="cust-button-secondary" onClick={onSwitchAccount}>
          Switch account
        </button>
      </div>
      {user.role !== "IE" && (
        <p className="cust-locked-notice" style={{ marginTop: 14 }}>
          Operators can browse machines, needles, and history, but only your factory's IE can
          raise a new issue.
        </p>
      )}
      <p className="cust-empty" style={{ marginTop: 14 }}>
        Real customer login isn't enabled yet — you're using the account picker as a stand-in
        while we test the dashboard.
      </p>
    </div>
  );
}
