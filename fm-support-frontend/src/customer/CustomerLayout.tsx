import type { ReactNode } from "react";
import type { UserRole } from "../types";

export type CustomerSection = "overview" | "sewing" | "automated" | "needles" | "tickets" | "purchases" | "settings";

const NAV_ITEMS: { key: CustomerSection; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "🏠" },
  { key: "sewing", label: "Sewing Machines", icon: "🧵" },
  { key: "automated", label: "Automated Machines", icon: "⚙️" },
  { key: "needles", label: "Needles", icon: "📍" },
  { key: "tickets", label: "Ticket History", icon: "📜" },
  { key: "purchases", label: "Purchase History", icon: "🧾" },
];

export default function CustomerLayout({
  active,
  onNavigate,
  userName,
  userRole,
  organizationName,
  onLogout,
  children,
}: {
  active: CustomerSection;
  onNavigate: (section: CustomerSection) => void;
  userName: string;
  userRole: UserRole;
  organizationName: string;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="cust-shell">
      <aside className="cust-sidebar">
        <div className="cust-logo">
          <div className="cust-logo-badge">FM</div>
          <div>
            <div className="cust-logo-text">FM Factory Support</div>
            <div className="cust-logo-sub">Customer Portal</div>
          </div>
        </div>

        <nav className="cust-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`cust-nav-item ${active === item.key ? "active" : ""}`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="cust-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="cust-sidebar-footer">
          <button
            className={`cust-nav-item ${active === "settings" ? "active" : ""}`}
            onClick={() => onNavigate("settings")}
          >
            <span className="cust-nav-icon">⚙️</span>
            Settings
          </button>
          <button className="cust-nav-item" onClick={onLogout}>
            <span className="cust-nav-icon">🚪</span>
            Log out
          </button>
        </div>
      </aside>

      <div className="cust-main">
        <header className="cust-topbar">
          <div>
            <h1>{NAV_ITEMS.find((n) => n.key === active)?.label ?? "Settings"}</h1>
            <div className="cust-topbar-sub">FM Factory Support — Customer Portal</div>
          </div>
          <div className="cust-profile">
            <div className="cust-profile-name">
              {userName} <span className="cust-role-badge">{userRole}</span>
            </div>
            <div className="cust-profile-org">{organizationName}</div>
          </div>
        </header>

        <div className="cust-content">{children}</div>
      </div>
    </div>
  );
}
