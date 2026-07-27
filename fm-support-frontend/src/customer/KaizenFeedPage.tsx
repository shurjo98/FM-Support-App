import { useEffect, useState } from "react";
import { Lightbulb, Plus, X } from "lucide-react";
import { fetchKaizen, submitKaizen, updateKaizenStatus, type KaizenStatus, type KaizenSuggestion } from "../api";
import type { CustomerUser } from "../types";

const STATUS_CFG: Record<KaizenStatus, { label: string; color: string; bg: string; next: KaizenStatus }> = {
  NEW: { label: "New", color: "#b45309", bg: "#fef3c7", next: "UNDER_REVIEW" },
  UNDER_REVIEW: { label: "Under Review", color: "#2563eb", bg: "#dbeafe", next: "DONE" },
  DONE: { label: "Done", color: "#15803d", bg: "#dcfce7", next: "NEW" },
};
const STATUSES: KaizenStatus[] = ["NEW", "UNDER_REVIEW", "DONE"];

function NewIdeaModal({ organizationId, user, onClose, onCreated }: { organizationId: string; user: CustomerUser; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitKaizen({ organizationId, submittedBy: user.name, title: title.trim(), description: description.trim() });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="cust-modal-overlay" onClick={onClose}>
      <div className="cust-modal" onClick={(e) => e.stopPropagation()}>
        <button className="cust-modal-close" onClick={onClose}><X size={16} /></button>
        <h2 className="cust-section-title" style={{ marginTop: 0 }}>New Improvement Idea</h2>
        <p className="cust-empty" style={{ marginBottom: 14 }}>
          Small, frequent improvements from the people doing the work — that's the whole idea. No suggestion is too small.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label>
            <div style={{ fontSize: 12, color: "rgba(36,31,66,0.62)", marginBottom: 4 }}>Idea</div>
            <input className="cust-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Move the oil can closer to Line A" style={{ width: "100%" }} />
          </label>
          <label>
            <div style={{ fontSize: 12, color: "rgba(36,31,66,0.62)", marginBottom: 4 }}>Why would this help?</div>
            <textarea className="cust-input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", resize: "vertical" }} />
          </label>
          {error && <div className="cust-error">{error}</div>}
          <button className="cust-button" onClick={handleSubmit} disabled={submitting || !title.trim() || !description.trim()}>
            {submitting ? "Submitting…" : "Submit idea"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KaizenFeedPage({ user }: { user: CustomerUser }) {
  const [items, setItems] = useState<KaizenSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | KaizenStatus>("ALL");
  const [showAdd, setShowAdd] = useState(false);

  function load() {
    fetchKaizen(user.organizationId).then(setItems).catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }
  useEffect(load, [user.organizationId]);

  async function advance(item: KaizenSuggestion) {
    const next = STATUS_CFG[item.status].next;
    setItems((prev) => prev ? prev.map((i) => (i.id === item.id ? { ...i, status: next } : i)) : prev);
    try {
      await updateKaizenStatus(item.id, next);
    } catch {
      load();
    }
  }

  if (error) return <div className="cust-error">{error}</div>;
  if (!items) return <p className="cust-empty">Loading suggestions…</p>;

  const visible = filter === "ALL" ? items : items.filter((i) => i.status === filter);

  return (
    <div>
      <p className="cust-empty" style={{ marginBottom: 18 }}>
        Kaizen — continuous improvement, one small idea at a time. Anyone at the factory can submit or move a card.
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div style={{ display: "inline-flex", padding: 3, background: "rgba(36,31,66,0.06)", borderRadius: 10, gap: 2 }}>
          {(["ALL", ...STATUSES] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                background: filter === f ? "#403D88" : "transparent",
                color: filter === f ? "#FFFFFF" : "rgba(36,31,66,0.62)",
              }}
            >
              {f === "ALL" ? "All" : STATUS_CFG[f].label}
            </button>
          ))}
        </div>
        <button className="cust-button" onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> New idea
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="cust-card" style={{ textAlign: "center", padding: "32px 18px" }}>
          <Lightbulb size={26} style={{ color: "rgba(36,31,66,0.35)", marginBottom: 8 }} />
          <p className="cust-empty" style={{ margin: 0 }}>No suggestions here yet — be the first.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visible.map((item) => {
            const cfg = STATUS_CFG[item.status];
            return (
              <div key={item.id} className="cust-card" style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "rgba(36,31,66,0.75)", marginTop: 4 }}>{item.description}</div>
                  <div style={{ fontSize: 11.5, color: "rgba(36,31,66,0.5)", marginTop: 8 }}>
                    {item.submittedBy ?? "Anonymous"} · {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => advance(item)}
                  title={`Move to ${STATUS_CFG[cfg.next].label}`}
                  style={{
                    flexShrink: 0, padding: "4px 12px", borderRadius: 999, border: "none", cursor: "pointer",
                    fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, whiteSpace: "nowrap",
                  }}
                >
                  {cfg.label}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <NewIdeaModal
          organizationId={user.organizationId}
          user={user}
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); load(); }}
        />
      )}
    </div>
  );
}
