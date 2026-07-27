import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  LayoutDashboard,
  Boxes,
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
  X,
  TrendingUp,
  CalendarClock,
  ClipboardCheck,
  Package,
  AlertOctagon,
  Cpu,
  Building2,
  Radio,
  Gauge,
  Lightbulb,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { useLang, type TranslationKey } from "./i18n";
import PortalSearchBar from "./PortalSearchBar";

export type CustomerSection =
  | "overview"
  | "equipment"
  | "sewing"
  | "automated"
  | "needles"
  | "spareparts"
  | "garments"
  | "tickets"
  | "purchases"
  | "andon"
  | "oee"
  | "kaizen"
  | "sops"
  | "insights"
  | "maintenance"
  | "audit"
  | "inventory"
  | "defects"
  | "robotics"
  | "group"
  | "settings";

type NavItem = { key: CustomerSection; labelKey: TranslationKey; icon: LucideIcon; group?: boolean };

// The drawer used to be one flat 14-item list — grouped headings make it
// scannable instead of a wall of icons to scroll through on a phone.
const NAV_GROUPS: { labelKey: TranslationKey | null; items: NavItem[] }[] = [
  { labelKey: null, items: [{ key: "overview", labelKey: "nav.overview", icon: LayoutDashboard }] },
  {
    labelKey: "navGroup.floor",
    items: [
      { key: "andon", labelKey: "nav.andon", icon: Radio },
      { key: "oee", labelKey: "nav.oee", icon: Gauge },
      { key: "kaizen", labelKey: "nav.kaizen", icon: Lightbulb },
    ],
  },
  {
    labelKey: "navGroup.report",
    items: [
      { key: "equipment", labelKey: "nav.equipment", icon: Boxes },
      { key: "sewing", labelKey: "nav.sewing", icon: Scissors },
      { key: "automated", labelKey: "nav.automated", icon: Bot },
    ],
  },
  {
    labelKey: "navGroup.history",
    items: [
      { key: "tickets", labelKey: "nav.tickets", icon: History },
      { key: "purchases", labelKey: "nav.purchases", icon: Receipt },
    ],
  },
  {
    labelKey: "navGroup.resources",
    items: [
      { key: "needles", labelKey: "nav.needles", icon: PenTool },
      { key: "spareparts", labelKey: "nav.spareparts", icon: Wrench },
      { key: "garments", labelKey: "nav.garments", icon: Shirt },
      { key: "sops", labelKey: "nav.sops", icon: BookOpen },
    ],
  },
  {
    labelKey: "navGroup.insights",
    items: [
      { key: "insights", labelKey: "nav.insights", icon: TrendingUp },
      { key: "maintenance", labelKey: "nav.maintenance", icon: CalendarClock },
      { key: "audit", labelKey: "nav.audit", icon: ClipboardCheck },
      { key: "inventory", labelKey: "nav.inventory", icon: Package },
      { key: "defects", labelKey: "nav.defects", icon: AlertOctagon },
      { key: "robotics", labelKey: "nav.robotics", icon: Cpu },
      { key: "group", labelKey: "nav.group", icon: Building2, group: true },
    ],
  },
];

const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export default function CustomerLayout({
  active,
  onNavigate,
  userName,
  organizationName,
  hasGroup,
  onLogout,
  children,
}: {
  active: CustomerSection;
  onNavigate: (section: CustomerSection) => void;
  userName: string;
  organizationName: string;
  hasGroup: boolean;
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
      {/* Decorative blobs bleed past the shell's edges on purpose, so this
          wrapper alone (not .cust-shell) clips them — clipping .cust-shell
          itself would silently break position: sticky on the sidebar below,
          the same overflow/sticky interaction that caused the navbar bug. */}
      <div className="cust-blob-layer" aria-hidden="true">
        <div
          className="cust-blob"
          style={{ top: "-120px", left: "-80px", width: "360px", height: "360px", background: "#8B639B", opacity: 0.22 }}
        />
        <div
          className="cust-blob"
          style={{ top: "20%", right: "-140px", width: "320px", height: "320px", background: "#AF719D", opacity: 0.3 }}
        />
        <div
          className="cust-blob"
          style={{ bottom: "-100px", left: "30%", width: "280px", height: "280px", background: "#F8B2B2", opacity: 0.35 }}
        />
      </div>

      {menuOpen && <div className="cust-sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      <aside className={`cust-sidebar ${menuOpen ? "mobile-open" : ""}`}>
        <div className="cust-sidebar-header">
          <a className="cust-logo" href="/" title="Back to home">
            <div className="cust-logo-badge">
              <img src="/public/logo/No_BG.png" alt="FM" />
            </div>
            <div>
              <div className="cust-logo-text">FM Factory Support</div>
              <div className="cust-logo-sub">Customer Portal</div>
            </div>
          </a>
          <button className="cust-sidebar-close" onClick={() => setMenuOpen(false)} aria-label={t("nav.closeMenu")}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <a className="cust-nav-item cust-home-link" href="/">
          <span className="cust-nav-icon">
            <ArrowLeft size={18} strokeWidth={2} />
          </span>
          Home
        </a>

        <nav className="cust-nav">
          {NAV_GROUPS.map((group, gi) => (
            <div className="cust-nav-group" key={group.labelKey ?? `g${gi}`}>
              {group.labelKey && <div className="cust-nav-group-label">{t(group.labelKey)}</div>}
              {group.items
                .filter((item) => !item.group || hasGroup)
                .map((item) => (
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
            </div>
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
          <PortalSearchBar onNavigate={onNavigate} compact={active !== "overview"} />
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
        <button className={active === "insights" ? "active" : ""} onClick={() => navigate("insights")}>
          <TrendingUp size={20} strokeWidth={2} />
          <span>{t("nav.insights")}</span>
        </button>
        <button className={menuOpen ? "active" : ""} onClick={() => setMenuOpen(true)}>
          <Menu size={20} strokeWidth={2} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
