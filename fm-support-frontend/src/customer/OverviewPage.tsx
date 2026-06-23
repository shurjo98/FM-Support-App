import { useEffect, useState } from "react";
import { fetchCustomerTickets, fetchPurchases } from "../api";
import type { CustomerTicket, CustomerUser, Purchase } from "../types";
import type { CustomerSection } from "./CustomerLayout";

const PRODUCT_LINES: { section: CustomerSection; name: string; image: string }[] = [
  { section: "sewing", name: "Sewing Machines", image: "/public/categories/lockstitch.png" },
  { section: "automated", name: "Automated Machines", image: "/public/machines/Interlock/K10.png" },
  { section: "needles", name: "Needles (Groz-Beckert)", image: "/public/needles/packing_image_1.png" },
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
          <div className="cust-stat-label">Machines Owned</div>
          <div className="cust-stat-value">{machinesOwned}</div>
        </div>
        <div className="cust-card">
          <div className="cust-stat-label">Total Issues Raised</div>
          <div className="cust-stat-value">{tickets.length}</div>
        </div>
        <div className="cust-card">
          <div className="cust-stat-label">Open Issues</div>
          <div className="cust-stat-value">{openTickets}</div>
        </div>
        <div className="cust-card">
          <div className="cust-stat-label">Needle Orders</div>
          <div className="cust-stat-value">{needleOrders}</div>
        </div>
        <div className="cust-card">
          <div className="cust-stat-label">Purchase Records</div>
          <div className="cust-stat-value">{purchases.length}</div>
        </div>
      </div>

      <h2 className="cust-section-title">What we supply</h2>
      <div className="cust-category-row">
        {PRODUCT_LINES.map((line) => (
          <div
            key={line.section}
            className="cust-card cust-card-clickable cust-category-card"
            onClick={() => onNavigate(line.section)}
          >
            <img src={line.image} alt={line.name} />
            <div className="cust-category-card-name">{line.name}</div>
          </div>
        ))}
      </div>

      <h2 className="cust-section-title">Recent issues</h2>
      {tickets.length === 0 ? (
        <p className="cust-empty">
          No issues raised yet. Your factory's IE can report one from the Sewing Machines or
          Automated Machines page.
        </p>
      ) : (
        <div className="cust-card">
          <table className="cust-table">
            <thead>
              <tr>
                <th>Issue Type</th>
                <th>Description</th>
                <th>Status</th>
                <th>Raised At</th>
              </tr>
            </thead>
            <tbody>
              {tickets.slice(0, 5).map((t) => (
                <tr key={t.id}>
                  <td>{t.issueType.replaceAll("_", " ")}</td>
                  <td>{t.description}</td>
                  <td>
                    <span className="cust-status-badge" style={{ backgroundColor: STATUS_COLORS[t.status] }}>
                      {t.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
