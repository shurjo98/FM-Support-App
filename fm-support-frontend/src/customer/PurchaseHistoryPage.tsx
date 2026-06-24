import { useEffect, useState } from "react";
import { fetchPurchases } from "../api";
import type { CustomerUser, Purchase } from "../types";
import { useLang } from "./i18n";
import ReorderButton from "./ReorderButton";

const ITEM_TYPE_KEY = {
  MACHINE: "itemType.machine",
  NEEDLE: "itemType.needle",
  SPARE_PART: "itemType.sparePart",
} as const;

export default function PurchaseHistoryPage({ user }: { user: CustomerUser }) {
  const { t } = useLang();
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
          {t("purchases.searchLabel")}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("purchases.searchPlaceholder")}
          />
        </label>
      </div>

      {error && <div className="cust-error">{error}</div>}

      {!purchases ? (
        <p className="cust-empty">{t("purchases.loading")}</p>
      ) : purchases.length === 0 ? (
        <p className="cust-empty">{t("purchases.none")}</p>
      ) : (
        <div className="cust-card">
          <table className="cust-table">
            <thead>
              <tr>
                <th>{t("table.item")}</th>
                <th>{t("table.type")}</th>
                <th>{t("table.model")}</th>
                <th>{t("table.serialNumber")}</th>
                <th>{t("table.qty")}</th>
                <th>{t("table.unitPrice")}</th>
                <th>{t("table.total")}</th>
                <th>{t("table.date")}</th>
                <th>{t("table.reorder")}</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td>{p.itemName}</td>
                  <td>{t(ITEM_TYPE_KEY[p.itemType])}</td>
                  <td>{p.machineModel ?? "—"}</td>
                  <td>{p.serialNumber ?? "—"}</td>
                  <td>{p.quantity}</td>
                  <td>{p.unitPrice.toLocaleString()}</td>
                  <td>{p.totalPrice.toLocaleString()}</td>
                  <td>{new Date(p.purchaseDate).toLocaleDateString()}</td>
                  <td>
                    {p.itemType !== "MACHINE" && (
                      <ReorderButton
                        user={user}
                        itemType={p.itemType}
                        itemName={p.itemName}
                        serialNumber={p.serialNumber}
                        defaultQuantity={p.quantity}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
