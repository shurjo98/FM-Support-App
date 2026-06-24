import type { ReactNode } from "react";
import type { InternalAccountLite } from "./types";

export type InternalTab = "dashboard" | "assignments" | "tasks" | "notifications";

const NAV_ITEMS: { key: InternalTab; label: string; icon: string }[] = [
  { key: "dashboard", label: "By Factory", icon: "🏭" },
  { key: "assignments", label: "Assignments", icon: "👥" },
  { key: "tasks", label: "Task Board", icon: "📋" },
  { key: "notifications", label: "Notifications", icon: "🔔" },
];

export default function InternalLayout({
  active,
  onNavigate,
  actingAccount,
  onSwitchAccount,
  onLogout,
  children,
}: {
  active: InternalTab;
  onNavigate: (tab: InternalTab) => void;
  actingAccount: InternalAccountLite;
  onSwitchAccount: () => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="int-shell">
      <aside className="int-sidebar">
        <a className="int-logo" href="/" title="Back to home">
          <div className="int-logo-badge">
            <img src="/public/logo/No_BG.png" alt="FM" />
          </div>
          <div>
            <div className="int-logo-text">FM Support</div>
            <div className="int-logo-sub">Internal Dashboard</div>
          </div>
        </a>
        <a className="int-nav-item int-home-link" href="/">
          <span className="int-nav-icon">⬅️</span>
          Home
        </a>

        <nav className="int-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`int-nav-item ${active === item.key ? "active" : ""}`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="int-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="int-sidebar-footer">
          <button className="int-nav-item" onClick={onLogout}>
            <span className="int-nav-icon">🚪</span>
            Log out
          </button>
        </div>
      </aside>

      <div className="int-main">
        <header className="int-topbar">
          <div>
            <h1>{NAV_ITEMS.find((n) => n.key === active)?.label}</h1>
            <div className="int-topbar-sub">FM Factory Support — Internal Team</div>
          </div>
          <div className="int-acting-as">
            <div className="int-acting-as-info">
              <span className="int-acting-as-name">{actingAccount.name}</span>
              <span className={`int-role-badge int-role-${actingAccount.role.toLowerCase()}`}>
                {actingAccount.role}
              </span>
            </div>
            <button className="int-switch-btn" onClick={onSwitchAccount}>
              Switch
            </button>
          </div>
        </header>

        <div className="int-content">{children}</div>
      </div>
    </div>
  );
}
