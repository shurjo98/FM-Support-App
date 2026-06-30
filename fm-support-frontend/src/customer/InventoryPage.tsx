import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Plus, Minus, Trash2, Edit2, Check, X } from "lucide-react";
import { fetchInventory, addStockItem, updateStockItem, useStockItem, deleteStockItem, type StockItem } from "../api";
import type { CustomerUser } from "../types";

function QuantityBar({ qty, min }: { qty: number; min: number }) {
  const pct = min > 0 ? Math.min(100, Math.round((qty / (min * 3)) * 100)) : 50;
  const color = qty === 0 ? "#dc2626" : qty <= min ? "#d97706" : "#16a34a";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "rgba(148,163,184,0.2)", borderRadius: 3, overflow: "hidden", minWidth: 60 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 30 }}>{qty}</span>
    </div>
  );
}

function InlineEdit({ value, onSave, type = "text" }: { value: string | number; onSave: (v: string) => void; type?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (!editing) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }} onClick={() => setEditing(true)}>
        {value} <Edit2 size={11} style={{ color: "#9ca3af" }} />
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <input
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        style={{ width: 70, padding: "2px 6px", borderRadius: 4, border: "1px solid #4fb3e8", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 13 }}
        autoFocus
      />
      <button onClick={() => { onSave(draft); setEditing(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#16a34a" }}><Check size={13} /></button>
      <button onClick={() => { setDraft(String(value)); setEditing(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}><X size={13} /></button>
    </span>
  );
}

export default function InventoryPage({ user }: { user: CustomerUser }) {
  const [data, setData] = useState<{ items: StockItem[]; lowCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addQty, setAddQty] = useState(0);
  const [addMin, setAddMin] = useState(2);
  const [addUnit, setAddUnit] = useState("pcs");
  const [adding, setAdding] = useState(false);

  function load() {
    fetchInventory(user.organizationId).then(setData).catch((e) => setError(e.message));
  }
  useEffect(load, [user.organizationId]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!addName.trim()) return;
    setAdding(true);
    try {
      await addStockItem({ organizationId: user.organizationId, name: addName.trim(), quantity: addQty, minThreshold: addMin, unit: addUnit });
      setAddName(""); setAddQty(0); setAddMin(2); setAddUnit("pcs"); setShowAdd(false);
      load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setAdding(false); }
  }

  async function handleUse(id: string, qty: number) {
    try {
      const updated = await useStockItem(id, qty);
      setData((prev) => prev ? { ...prev, items: prev.items.map((i) => i.id === id ? { ...updated } : i), lowCount: prev.items.filter((i) => i.id === id ? updated.low : i.low).length } : prev);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handlePatch(id: string, patch: Parameters<typeof updateStockItem>[1]) {
    try {
      const updated = await updateStockItem(id, patch);
      setData((prev) => prev ? { ...prev, items: prev.items.map((i) => i.id === id ? { ...i, ...updated, low: updated.quantity <= updated.minThreshold } : i) } : prev);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleDelete(id: string) {
    await deleteStockItem(id);
    setData((prev) => prev ? { ...prev, items: prev.items.filter((i) => i.id !== id) } : prev);
  }

  if (error) return <div className="cust-error">{error}</div>;
  if (!data) return <p className="cust-empty">Loading spare parts inventory…</p>;

  const lowItems = data.items.filter((i) => i.low);

  return (
    <div>
      {/* Alert banner */}
      {lowItems.length > 0 && (
        <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <AlertTriangle size={18} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 600, color: "#92400e" }}>{lowItems.length} item{lowItems.length > 1 ? "s" : ""} at or below reorder level</div>
            <div style={{ fontSize: 13, color: "#78350f", marginTop: 2 }}>
              {lowItems.map((i) => i.name).join(", ")}
            </div>
          </div>
        </div>
      )}

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>{data.items.length} parts tracked</div>
        <button className="cust-button" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }} onClick={() => setShowAdd((v) => !v)}>
          <Plus size={15} /> Add Part
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form className="cust-card cust-form" onSubmit={handleAdd} style={{ marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Add spare part to stock</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
            <label>Part name<input className="cust-input" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. Bobbin case J-97A" style={{ width: "100%", marginTop: 4 }} /></label>
            <label>Current qty<input className="cust-input" type="number" min={0} value={addQty} onChange={(e) => setAddQty(Number(e.target.value))} style={{ width: "100%", marginTop: 4 }} /></label>
            <label>Reorder at<input className="cust-input" type="number" min={0} value={addMin} onChange={(e) => setAddMin(Number(e.target.value))} style={{ width: "100%", marginTop: 4 }} /></label>
            <label>Unit<input className="cust-input" value={addUnit} onChange={(e) => setAddUnit(e.target.value)} placeholder="pcs" style={{ width: "100%", marginTop: 4 }} /></label>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="cust-button" type="submit" disabled={adding || !addName.trim()}>{adding ? "Adding…" : "Add to stock"}</button>
            <button className="cust-button-secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </form>
      )}

      {data.items.length === 0 ? (
        <p className="cust-empty">No parts tracked yet. Add your first spare part above.</p>
      ) : (
        <div className="cust-card">
          <table className="cust-table">
            <thead>
              <tr>
                <th>Part</th>
                <th>Stock</th>
                <th>Reorder At</th>
                <th>Unit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} style={{ background: item.low ? "rgba(220,38,38,0.04)" : undefined }}>
                  <td>
                    <InlineEdit value={item.name} onSave={(v) => handlePatch(item.id, { name: v })} />
                    {item.low && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fee2e2", borderRadius: 4, padding: "1px 5px" }}>LOW</span>}
                  </td>
                  <td style={{ minWidth: 120 }}>
                    <QuantityBar qty={item.quantity} min={item.minThreshold} />
                  </td>
                  <td>
                    <InlineEdit value={item.minThreshold} type="number" onSave={(v) => handlePatch(item.id, { minThreshold: Number(v) })} />
                  </td>
                  <td>
                    <InlineEdit value={item.unit} onSave={(v) => handlePatch(item.id, { unit: v })} />
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button
                        className="cust-button-secondary"
                        style={{ padding: "4px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                        onClick={() => handlePatch(item.id, { quantity: item.quantity + 1 })}
                        title="Add 1"
                      >
                        <Plus size={11} />
                      </button>
                      <button
                        className="cust-button-secondary"
                        style={{ padding: "4px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                        onClick={() => item.quantity > 0 && handleUse(item.id, 1)}
                        disabled={item.quantity === 0}
                        title="Use 1"
                      >
                        <Minus size={11} />
                      </button>
                      <button
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 4 }}
                        onClick={() => handleDelete(item.id)}
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
