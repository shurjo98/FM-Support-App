import { useEffect, useState } from "react";
import { fetchCustomerTickets, fetchPurchases } from "../api";
import type { CustomerTicket, CustomerUser, Purchase } from "../types";
import type { CustomerSection } from "./CustomerLayout";
import { useLang, type TranslationKey } from "./i18n";

const PRODUCT_LINES: { section: CustomerSection; nameKey: TranslationKey; image: string }[] = [
  { section: "sewing", nameKey: "nav.sewing", image: "/public/categories/lockstitch.png" },
  { section: "automated", nameKey: "nav.automated", image: "/public/machines/Interlock/K10.png" },
  { section: "needles", nameKey: "nav.needles", image: "/public/needles/packing_image_1.png" },
];

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#d97706",
  IN_PROGRESS: "#2563eb",
  COMPLETED: "#16a34a",
};

export default function OverviewPage({
  user,
  onNavigate,
}: {
  user: CustomerUser;
  onNavigate: (section: CustomerSection) => void;
}) {
  const { t } = useLang();
  const [tickets, setTickets] = useState<CustomerTicket[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchCustomerTickets(user.id), fetchPurchases({ organizationId: user.organizationId })])
      .then(([t, p]) => {
        setTickets(t);
        setPurchases(p);
      })
      .catch((err) => setError(err.message));
  }, [user.id, user.organizationId]);

  const machinesOwned = new Set(
    purchases.filter((p) => p.itemType === "MACHINE" && p.serialNumber).map((p) => p.serialNumber)
  ).size;
  const needleOrders = purchases.filter((p) => p.itemType === "NEEDLE").length;
  const openTickets = tickets.filter((t) => t.status === "OPEN").length;

  return (
    <div>
      {error && <div className="cust-error">{error}</div>}

      <div className="cust-stat-grid">
        <div className="cust-card">
          <div className="cust-stat-label">{t("overview.machinesOwned")}</div>
          <div className="cust-stat-value">{machinesOwned}</div>
        </div>
        <div className="cust-card">
          <div className="cust-stat-label">{t("overview.totalIssues")}</div>
          <div className="cust-stat-value">{tickets.length}</div>
        </div>
        <div className="cust-card">
          <div className="cust-stat-label">{t("overview.openIssues")}</div>
          <div className="cust-stat-value">{openTickets}</div>
        </div>
        <div className="cust-card">
          <div className="cust-stat-label">{t("overview.needleOrders")}</div>
          <div className="cust-stat-value">{needleOrders}</div>
        </div>
        <div className="cust-card">
          <div className="cust-stat-label">{t("overview.purchaseRecords")}</div>
          <div className="cust-stat-value">{purchases.length}</div>
        </div>
      </div>

      <h2 className="cust-section-title">{t("overview.whatWeSupply")}</h2>
      <div className="cust-category-row">
        {PRODUCT_LINES.map((line) => (
          <div
            key={line.section}
            className="cust-card cust-card-clickable cust-category-card"
            onClick={() => onNavigate(line.section)}
          >
            <img src={line.image} alt={t(line.nameKey)} />
            <div className="cust-category-card-name">{t(line.nameKey)}</div>
          </div>
        ))}
      </div>

      <div className="cust-card cust-card-clickable" style={{ marginBottom: 24 }} onClick={() => onNavigate("garments")}>
        {t("overview.garmentGuideCta")}
      </div>

      <h2 className="cust-section-title">{t("overview.recentIssues")}</h2>
      {tickets.length === 0 ? (
        <p className="cust-empty">{t("overview.noIssues")}</p>
      ) : (
        <div className="cust-card">
          <table className="cust-table">
            <thead>
              <tr>
                <th>{t("table.issueType")}</th>
                <th>{t("table.description")}</th>
                <th>{t("table.status")}</th>
                <th>{t("table.raisedAt")}</th>
              </tr>
            </thead>
            <tbody>
              {tickets.slice(0, 5).map((tk) => (
                <tr key={tk.id}>
                  <td>{tk.issueType.replaceAll("_", " ")}</td>
                  <td>{tk.description}</td>
                  <td>
                    <span className="cust-status-badge" style={{ backgroundColor: STATUS_COLORS[tk.status] }}>
                      {tk.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>{new Date(tk.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
