import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  LayoutDashboard,
  Scissors,
  Bot,
  PenTool,
  Wrench,
  Shirt,
  History,
  Receipt,
  Settings,
  LogOut,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { useLang, type TranslationKey } from "./i18n";
import PortalSearchBar from "./PortalSearchBar";

export type CustomerSection =
  | "overview"
  | "sewing"
  | "automated"
  | "needles"
  | "spareparts"
  | "garments"
  | "tickets"
  | "purchases"
  | "settings";

const NAV_ITEMS: { key: CustomerSection; labelKey: TranslationKey; icon: LucideIcon }[] = [
  { key: "overview", labelKey: "nav.overview", icon: LayoutDashboard },
  { key: "sewing", labelKey: "nav.sewing", icon: Scissors },
  { key: "automated", labelKey: "nav.automated", icon: Bot },
  { key: "needles", labelKey: "nav.needles", icon: PenTool },
  { key: "spareparts", labelKey: "nav.spareparts", icon: Wrench },
  { key: "garments", labelKey: "nav.garments", icon: Shirt },
  { key: "tickets", labelKey: "nav.tickets", icon: History },
  { key: "purchases", labelKey: "nav.purchases", icon: Receipt },
];

export default function CustomerLayout({
  active,
  onNavigate,
  userName,
  organizationName,
  onLogout,
  children,
}: {
  active: CustomerSection;
  onNavigate: (section: CustomerSection) => void;
  userName: string;
  organizationName: string;
  onLogout: () => void;
  children: ReactNode;
}) {
  const { lang, setLang, t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);

  function navigate(section: CustomerSection) {
    onNavigate(section);
    setMenuOpen(false);
  }

  return (
    <div className="cust-shell">
      {menuOpen && <div className="cust-sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      <aside className={`cust-sidebar ${menuOpen ? "mobile-open" : ""}`}>
        <a className="cust-logo" href="/" title="Back to home">
          <div className="cust-logo-badge">
            <img src="/public/logo/No_BG.png" alt="FM" />
          </div>
          <div>
            <div className="cust-logo-text">FM Factory Support</div>
            <div className="cust-logo-sub">Customer Portal</div>
          </div>
        </a>
        <a className="cust-nav-item cust-home-link" href="/">
          <span className="cust-nav-icon">
            <ArrowLeft size={18} strokeWidth={2} />
          </span>
          Home
        </a>

        <nav className="cust-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`cust-nav-item ${active === item.key ? "active" : ""}`}
              onClick={() => navigate(item.key)}
            >
              <span className="cust-nav-icon">
                <item.icon size={18} strokeWidth={2} />
              </span>
              {t(item.labelKey)}
            </button>
          ))}
        </nav>

        <div className="cust-sidebar-footer">
          <div className="cust-lang-toggle">
            <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>
              EN
            </button>
            <button className={lang === "bn" ? "active" : ""} onClick={() => setLang("bn")}>
              বাংলা
            </button>
          </div>
          <button
            className={`cust-nav-item ${active === "settings" ? "active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <span className="cust-nav-icon">
              <Settings size={18} strokeWidth={2} />
            </span>
            {t("nav.settings")}
          </button>
          <button className="cust-nav-item" onClick={onLogout}>
            <span className="cust-nav-icon">
              <LogOut size={18} strokeWidth={2} />
            </span>
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      <div className="cust-main">
        <header className="cust-topbar">
          <div className="cust-topbar-left">
            <button className="cust-hamburger" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
              <Menu size={22} strokeWidth={2} />
            </button>
            <div>
              <h1>{t(NAV_ITEMS.find((n) => n.key === active)?.labelKey ?? "nav.settings")}</h1>
              <div className="cust-topbar-sub">{t("topbar.subtitle")}</div>
            </div>
          </div>
          <div className="cust-profile">
            <div className="cust-profile-name">{userName}</div>
            <div className="cust-profile-org">{organizationName}</div>
          </div>
        </header>

        <div className="cust-search-row">
          <PortalSearchBar onNavigate={onNavigate} />
        </div>

        <div className="cust-content">{children}</div>
      </div>

      <nav className="cust-bottom-tabbar">
        <button className={active === "overview" ? "active" : ""} onClick={() => navigate("overview")}>
          <LayoutDashboard size={20} strokeWidth={2} />
          <span>{t("nav.overview")}</span>
        </button>
        <button className={active === "tickets" ? "active" : ""} onClick={() => navigate("tickets")}>
          <History size={20} strokeWidth={2} />
          <span>{t("nav.tickets")}</span>
        </button>
        <button className={active === "purchases" ? "active" : ""} onClick={() => navigate("purchases")}>
          <Receipt size={20} strokeWidth={2} />
          <span>{t("nav.purchases")}</span>
        </button>
        <button className={menuOpen ? "active" : ""} onClick={() => setMenuOpen(true)}>
          <Menu size={20} strokeWidth={2} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
