import { useEffect, useState } from "react";
import { fetchNeedleProducts, fetchPurchases } from "../api";
import type { CustomerUser, NeedleProduct, Purchase } from "../types";

export default function NeedlesPage({ user }: { user: CustomerUser }) {
  const [catalog, setCatalog] = useState<NeedleProduct[]>([]);
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchNeedleProducts()
      .then(setCatalog)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    fetchPurchases({ organizationId: user.organizationId, itemType: "NEEDLE", query: query.trim() || undefined })
      .then(setPurchases)
      .catch((err) => setError(err.message));
  }, [user.organizationId, query]);

  return (
    <div>
      <p className="cust-empty" style={{ marginBottom: 18 }}>
        We supply Groz-Beckert needles to garment factories across Bangladesh — the most trusted
        needle brand for industrial sewing.
      </p>

      {error && <div className="cust-error">{error}</div>}

      <h2 className="cust-section-title">Groz-Beckert needle catalog</h2>
      <div className="cust-machine-grid" style={{ marginBottom: 28 }}>
        {catalog.map((n) => (
          <div key={n.id} className="cust-card cust-machine-option">
            <img src={n.imageUrl} alt={n.name} />
            <div className="cust-machine-option-name">{n.name}</div>
            <div className="cust-machine-option-model">{n.system}</div>
            {n.description && (
              <div className="cust-empty" style={{ marginTop: 6, fontSize: "0.72rem" }}>
                {n.description}
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="cust-section-title">Your needle order history</h2>
      <div className="cust-card cust-form" style={{ marginBottom: 18 }}>
        <label>
          Search by needle system or machine serial number
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. DBx1 or A6-001-2025"
          />
        </label>
      </div>

      {!purchases ? (
        <p className="cust-empty">Loading order history...</p>
      ) : purchases.length === 0 ? (
        <p className="cust-empty">No needle orders found.</p>
      ) : (
        <div className="cust-card">
          <table className="cust-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>System</th>
                <th>Used On</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td>{p.itemName}</td>
                  <td>{p.needleSystem ?? "—"}</td>
                  <td>{p.serialNumber ?? "—"}</td>
                  <td>{p.quantity}</td>
                  <td>{p.unitPrice.toLocaleString()}</td>
                  <td>{p.totalPrice.toLocaleString()}</td>
                  <td>{new Date(p.purchaseDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
