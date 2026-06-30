import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, X, FileText, Upload, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { fetchAudit, updateAuditItem, uploadAuditDocument, compliancePdfUrl, type AuditItemRow } from "../api";
import type { CustomerUser } from "../types";
import { Download } from "lucide-react";

type AuditStatus = AuditItemRow["status"];

const STATUS_CFG = {
  DONE:        { label: "Done",        color: "#16a34a", bg: "#dcfce7" },
  IN_PROGRESS: { label: "In Progress", color: "#d97706", bg: "#fef3c7" },
  NOT_DONE:    { label: "Not Done",    color: "#dc2626", bg: "#fee2e2" },
  NA:          { label: "N/A",         color: "#6b7280", bg: "#f3f4f6" },
} as const;

const CATEGORIES = ["Machine Maintenance", "Documentation", "Safety", "Operator Compliance"] as const;

function StatusPill({ status, onClick }: { status: AuditStatus; onClick: () => void }) {
  const cfg = STATUS_CFG[status];
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 10px", borderRadius: 12, border: "none", cursor: "pointer",
        fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </button>
  );
}

const CYCLE: AuditStatus[] = ["NOT_DONE", "IN_PROGRESS", "DONE", "NA"];

function AuditItemRow({
  item, onUpdate,
}: {
  item: AuditItemRow;
  onUpdate: (updated: AuditItemRow) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function cycleStatus() {
    const next = CYCLE[(CYCLE.indexOf(item.status) + 1) % CYCLE.length];
    setSaving(true);
    try { onUpdate(await updateAuditItem(item.id, { status: next })); }
    finally { setSaving(false); }
  }

  async function saveNotes() {
    if (notes === (item.notes ?? "")) return;
    setSaving(true);
    try { onUpdate(await updateAuditItem(item.id, { notes })); }
    finally { setSaving(false); }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { onUpdate(await uploadAuditDocument(item.id, file)); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <div style={{ borderBottom: "1px solid rgba(148,163,184,0.15)", padding: "10px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <StatusPill status={item.status} onClick={cycleStatus} />
        {item.autoFilled && (
          <span style={{ fontSize: 10, color: "#2563eb", background: "#dbeafe", borderRadius: 6, padding: "1px 6px", fontWeight: 600 }}>
            <Sparkles size={9} style={{ marginRight: 2 }} />Auto
          </span>
        )}
        <span style={{ flex: 1, fontSize: 13, color: item.status === "DONE" ? "#6b7280" : "inherit", textDecoration: item.status === "NA" ? "line-through" : "none" }}>
          {item.question}
        </span>
        {(item.documentUrl || item.notes) && (
          <span style={{ fontSize: 11, color: "#9ca3af" }}>
            {item.documentUrl && <FileText size={12} />}
          </span>
        )}
        <button onClick={() => setExpanded((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 2 }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div style={{ paddingLeft: 8, paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Add notes or action plan..."
            rows={2}
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(255,255,255,0.05)", color: "white", resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {item.documentUrl ? (
              <a href={item.documentUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#60a5fa", display: "flex", alignItems: "center", gap: 4 }}>
                <FileText size={12} /> View document
              </a>
            ) : null}
            <button
              className="cust-button-secondary"
              style={{ fontSize: 11, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload size={11} /> {uploading ? "Uploading…" : item.documentUrl ? "Replace document" : "Upload document"}
            </button>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={handleFile} />
            {saving && <span style={{ fontSize: 11, color: "#9ca3af" }}>Saving…</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditPage({ user }: { user: CustomerUser }) {
  const [data, setData] = useState<{ items: AuditItemRow[]; total: number; done: number; pct: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(CATEGORIES));

  useEffect(() => {
    fetchAudit(user.organizationId)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [user.organizationId]);

  function handleUpdate(updated: AuditItemRow) {
    setData((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((i) => (i.id === updated.id ? updated : i));
      const done = items.filter((i) => i.status === "DONE").length;
      return { ...prev, items, done, pct: Math.round((done / prev.total) * 100) };
    });
  }

  function toggleCat(cat: string) {
    setOpenCats((prev) => { const s = new Set(prev); s.has(cat) ? s.delete(cat) : s.add(cat); return s; });
  }

  if (error) return <div className="cust-error">{error}</div>;
  if (!data) return <p className="cust-empty">Loading audit checklist…</p>;

  const pctColor = data.pct >= 80 ? "#16a34a" : data.pct >= 50 ? "#d97706" : "#dc2626";

  return (
    <div>
      {/* Progress header */}
      <div className="cust-card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: pctColor }}>{data.pct}% complete</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>{data.done} of {data.total} items done</div>
          </div>
          <a
            href={compliancePdfUrl(user.organizationId)}
            download
            className="cust-button"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
          >
            <Download size={14} /> Download Compliance PDF
          </a>
        </div>
        {/* Progress bar */}
        <div style={{ height: 8, background: "rgba(148,163,184,0.2)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${data.pct}%`, background: pctColor, borderRadius: 4, transition: "width 0.4s" }} />
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
          Items marked <span style={{ color: "#2563eb", fontWeight: 600 }}>Auto</span> are filled automatically from your portal data.
          Click any status pill to cycle it. Expand an item to add notes or upload a document.
        </div>
      </div>

      {/* Category sections */}
      {CATEGORIES.map((cat) => {
        const items = data.items.filter((i) => i.category === cat);
        const catDone = items.filter((i) => i.status === "DONE").length;
        const isOpen = openCats.has(cat);

        return (
          <div key={cat} className="cust-card" style={{ marginBottom: 12 }}>
            <button
              onClick={() => toggleCat(cat)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, color: "white" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{cat}</span>
                <span style={{ fontSize: 12, color: catDone === items.length ? "#16a34a" : "#9ca3af" }}>
                  {catDone}/{items.length}
                </span>
              </div>
              {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isOpen && (
              <div style={{ marginTop: 8 }}>
                {items.map((item) => (
                  <AuditItemRow key={item.id} item={item} onUpdate={handleUpdate} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
