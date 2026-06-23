import { useEffect, useState } from "react";
import { fetchPurchases } from "../api";
import type { CustomerUser, Purchase } from "../types";

export default function PurchaseHistoryPage({ user }: { user: CustomerUser }) {
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchPurchases({ organizationId: user.organizationId, query: query.trim() || undefined })
      .then(setPurchases)
      .catch((err) => setError(err.message));
  }, [user.organizationId, query]);

  return (
    <div>
      <div className="cust-card cust-form" style={{ marginBottom: 18 }}>
        <label>
          Search by machine model or serial number
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. A4C or A6-001-2025"
          />
        </label>
      </div>

      {error && <div className="cust-error">{error}</div>}

      {!purchases ? (
        <p className="cust-empty">Loading purchase history...</p>
      ) : purchases.length === 0 ? (
        <p className="cust-empty">No purchases found.</p>
      ) : (
        <div className="cust-card">
          <table className="cust-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Type</th>
                <th>Model</th>
                <th>Serial Number</th>
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
                  <td>{p.itemType === "MACHINE" ? "Machine" : "Spare Part"}</td>
                  <td>{p.machineModel ?? "—"}</td>
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
