import { useEffect, useState } from "react";
import { fetchSpareParts, fetchPurchases, fetchReorders } from "../api";
import type { CustomerUser, Purchase, ReorderRequest, SparePart } from "../types";
import { useLang } from "./i18n";
import ReorderButton from "./ReorderButton";
import DetailModal from "./DetailModal";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#d97706",
  CONFIRMED: "#2563eb",
  FULFILLED: "#16a34a",
};

const REORDER_STATUS_KEY = {
  PENDING: "reorder.status.PENDING",
  CONFIRMED: "reorder.status.CONFIRMED",
  FULFILLED: "reorder.status.FULFILLED",
} as const;

export default function SparePartsPage({ user }: { user: CustomerUser }) {
  const { t } = useLang();
  const [catalog, setCatalog] = useState<SparePart[]>([]);
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [reorders, setReorders] = useState<ReorderRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [detailPart, setDetailPart] = useState<SparePart | null>(null);

  useEffect(() => {
    fetchSpareParts()
      .then(setCatalog)
      .catch((err) => setError(err.message));
  }, []);

  function loadReorders() {
    fetchReorders(user.organizationId)
      .then((rows) => setReorders(rows.filter((r) => r.itemType === "SPARE_PART")))
      .catch((err) => setError(err.message));
  }

  useEffect(loadReorders, [user.organizationId]);

  useEffect(() => {
    fetchPurchases({ organizationId: user.organizationId, itemType: "SPARE_PART", query: query.trim() || undefined })
      .then(setPurchases)
      .catch((err) => setError(err.message));
  }, [user.organizationId, query]);

  return (
    <div>
      <p className="cust-empty" style={{ marginBottom: 18 }}>
        {t("spareparts.intro")}
      </p>

      {error && <div className="cust-error">{error}</div>}

      <h2 className="cust-section-title">{t("spareparts.catalog")}</h2>
      <div className="cust-machine-grid" style={{ marginBottom: 28 }}>
        {catalog.map((sp) => (
          <div
            key={sp.id}
            className="cust-card cust-card-clickable cust-machine-option"
            onClick={() => setDetailPart(sp)}
          >
            {sp.imageUrl ? <img src={sp.imageUrl} alt={sp.name} /> : <div className="cust-part-icon">🔧</div>}
            <div className="cust-machine-option-name">{sp.name}</div>
            <div className="cust-machine-option-model">{sp.compatibleWith}</div>
            <div style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
              <ReorderButton
                user={user}
                itemType="SPARE_PART"
                itemName={sp.name}
                sparePartId={sp.id}
                defaultQuantity={5}
                onRequested={loadReorders}
              />
            </div>
          </div>
        ))}
      </div>

      {detailPart && (
        <DetailModal
          title={detailPart.name}
          subtitle={`${t("spareparts.compatibleWith")}: ${detailPart.compatibleWith}`}
          images={detailPart.imageUrl ? [detailPart.imageUrl] : []}
          description={detailPart.description}
          onClose={() => setDetailPart(null)}
        >
          <ReorderButton
            user={user}
            itemType="SPARE_PART"
            itemName={detailPart.name}
            sparePartId={detailPart.id}
            defaultQuantity={5}
            onRequested={loadReorders}
          />
        </DetailModal>
      )}

      <h2 className="cust-section-title">{t("reorder.yourRequests")}</h2>
      {reorders.length === 0 ? (
        <p className="cust-empty" style={{ marginBottom: 28 }}>
          {t("reorder.noRequests")}
        </p>
      ) : (
        <div className="cust-card" style={{ marginBottom: 28 }}>
          <table className="cust-table">
            <thead>
              <tr>
                <th>{t("table.item")}</th>
                <th>{t("table.qty")}</th>
                <th>{t("table.status")}</th>
                <th>{t("table.date")}</th>
              </tr>
            </thead>
            <tbody>
              {reorders.map((r) => (
                <tr key={r.id}>
                  <td>{r.itemName}</td>
                  <td>{r.quantity}</td>
                  <td>
                    <span className="cust-status-badge" style={{ backgroundColor: STATUS_COLORS[r.status] }}>
                      {t(REORDER_STATUS_KEY[r.status])}
                    </span>
                  </td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="cust-section-title">{t("spareparts.orderHistory")}</h2>
      <div className="cust-card cust-form" style={{ marginBottom: 18 }}>
        <label>
          {t("spareparts.searchLabel")}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Bobbin Case"
          />
        </label>
      </div>

      {!purchases ? (
        <p className="cust-empty">{t("purchases.loading")}</p>
      ) : purchases.length === 0 ? (
        <p className="cust-empty">{t("spareparts.noOrders")}</p>
      ) : (
        <div className="cust-card">
          <table className="cust-table">
            <thead>
              <tr>
                <th>{t("table.item")}</th>
                <th>{t("table.usedOn")}</th>
                <th>{t("table.qty")}</th>
                <th>{t("table.unitPrice")}</th>
                <th>{t("table.total")}</th>
                <th>{t("table.date")}</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td>{p.itemName}</td>
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
