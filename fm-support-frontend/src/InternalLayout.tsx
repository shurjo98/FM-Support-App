import { useState, type ReactNode } from "react";
import { ArrowLeft, Factory, Users, Kanban, Newspaper, Target, Bell, LogOut, Menu, RefreshCw, ShieldCheck, type LucideIcon } from "lucide-react";
import type { InternalAccountLite } from "./types";
import { Avatar } from "./Avatar";
import { RoleBadges } from "./RoleBadges";
import { isFmAdmin } from "./permissions";

export type InternalTab = "dashboard" | "assignments" | "tasks" | "content" | "teamhub" | "team" | "notifications";

const NAV_ITEMS: { key: InternalTab; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { key: "dashboard", label: "By Factory", icon: Factory },
  { key: "assignments", label: "Assignments", icon: Users },
  { key: "tasks", label: "Task Board", icon: Kanban },
  { key: "content", label: "Content Studio", icon: Newspaper },
  { key: "teamhub", label: "Team Hub", icon: Target },
  { key: "team", label: "Team Management", icon: ShieldCheck, adminOnly: true },
  { key: "notifications", label: "Notifications", icon: Bell },
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
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.adminOnly || isFmAdmin(actingAccount));

  function navigate(tab: InternalTab) {
    onNavigate(tab);
    setMenuOpen(false);
  }

  return (
    <div className="int-shell">
      {menuOpen && <div className="int-sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      <aside className={`int-sidebar ${menuOpen ? "mobile-open" : ""}`}>
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
          <span className="int-nav-icon">
            <ArrowLeft size={18} strokeWidth={2} />
          </span>
          Home
        </a>

        <nav className="int-nav">
          {visibleNavItems.map((item) => (
            <button
              key={item.key}
              className={`int-nav-item ${active === item.key ? "active" : ""}`}
              onClick={() => navigate(item.key)}
            >
              <span className="int-nav-icon">
                <item.icon size={18} strokeWidth={2} />
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="int-sidebar-footer">
          <button className="int-nav-item" onClick={onLogout}>
            <span className="int-nav-icon">
              <LogOut size={18} strokeWidth={2} />
            </span>
            Log out
          </button>
        </div>
      </aside>

      <div className="int-main">
        <header className="int-topbar">
          <div className="int-topbar-left">
            <button className="int-hamburger" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
              <Menu size={22} strokeWidth={2} />
            </button>
            <div>
              <h1>{NAV_ITEMS.find((n) => n.key === active)?.label}</h1>
              <div className="int-topbar-sub">FM Factory Support — Internal Team</div>
            </div>
          </div>
          <div className="int-acting-as">
            <Avatar name={actingAccount.name} avatarUrl={actingAccount.avatarUrl} size={32} />
            <div className="int-acting-as-info">
              <span className="int-acting-as-name">{actingAccount.name}</span>
              <span className="role-badges-list">
                <RoleBadges roles={actingAccount.roles} />
              </span>
            </div>
            <button className="int-switch-btn" onClick={onSwitchAccount}>
              <RefreshCw size={14} strokeWidth={2} />
              Switch
            </button>
          </div>
        </header>

        <div className="int-content">{children}</div>
      </div>
    </div>
  );
}
