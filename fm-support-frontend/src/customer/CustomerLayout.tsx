import { useState, type ReactNode } from "react";
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

const NAV_ITEMS: { key: CustomerSection; labelKey: TranslationKey; icon: string }[] = [
  { key: "overview", labelKey: "nav.overview", icon: "🏠" },
  { key: "sewing", labelKey: "nav.sewing", icon: "🧵" },
  { key: "automated", labelKey: "nav.automated", icon: "⚙️" },
  { key: "needles", labelKey: "nav.needles", icon: "📍" },
  { key: "spareparts", labelKey: "nav.spareparts", icon: "🔧" },
  { key: "garments", labelKey: "nav.garments", icon: "👕" },
  { key: "tickets", labelKey: "nav.tickets", icon: "📜" },
  { key: "purchases", labelKey: "nav.purchases", icon: "🧾" },
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
          <span className="cust-nav-icon">⬅️</span>
          Home
        </a>

        <nav className="cust-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`cust-nav-item ${active === item.key ? "active" : ""}`}
              onClick={() => navigate(item.key)}
            >
              <span className="cust-nav-icon">{item.icon}</span>
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
            <span className="cust-nav-icon">⚙️</span>
            {t("nav.settings")}
          </button>
          <button className="cust-nav-item" onClick={onLogout}>
            <span className="cust-nav-icon">🚪</span>
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      <div className="cust-main">
        <header className="cust-topbar">
          <div className="cust-topbar-left">
            <button className="cust-hamburger" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
              ☰
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
    </div>
  );
}
