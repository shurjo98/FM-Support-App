import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, Circle, Upload } from "lucide-react";
import { fetchSops, saveSop, uploadSopPhoto, type SopMachine } from "../api";
import type { CustomerUser } from "../types";

function DetailHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <button className="cust-button-secondary" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px" }}>
        <ArrowLeft size={14} /> Back
      </button>
      <h3 className="cust-section-title" style={{ margin: 0 }}>{title}</h3>
    </div>
  );
}

function SopDetail({ machine, user, onBack, onSaved }: { machine: SopMachine; user: CustomerUser; onBack: () => void; onSaved: () => void }) {
  const [text, setText] = useState((machine.sop?.steps ?? []).join("\n"));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    const steps = text.split("\n").map((s) => s.trim()).filter(Boolean);
    if (steps.length === 0) return;
    setSaving(true);
    try {
      await saveSop(machine.id, steps, user.name);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadSopPhoto(machine.id, file);
      onSaved();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <DetailHeader title={machine.name} onBack={onBack} />
      <div className="cust-card" style={{ marginBottom: 16 }}>
        <p className="cust-empty" style={{ marginBottom: 10 }}>
          The standard procedure for every {machine.name} — one line per step. Every operator servicing this
          model should follow the same steps, in the same order.
        </p>
        <textarea
          className="cust-input"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"e.g.\nPower off and unplug the machine\nRemove the needle plate\nClean lint from the feed dog"}
          style={{ width: "100%", marginBottom: 12, resize: "vertical" }}
        />
        <button className="cust-button" onClick={handleSave} disabled={saving || !text.trim()}>
          {saving ? "Saving…" : "Save procedure"}
        </button>
        {machine.sop?.updatedAt && (
          <span style={{ fontSize: 11.5, color: "rgba(36,31,66,0.5)", marginLeft: 10 }}>
            Last updated {new Date(machine.sop.updatedAt).toLocaleDateString()}
            {machine.sop.updatedBy ? ` by ${machine.sop.updatedBy}` : ""}
          </span>
        )}
      </div>

      <div className="cust-card">
        <h3 className="cust-section-title" style={{ marginTop: 0 }}>Reference photos</h3>
        {machine.sop?.photoIds.length ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            {machine.sop.photoIds.map((id) => (
              <img key={id} src={`/files/${id}`} alt="" style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 10 }} />
            ))}
          </div>
        ) : (
          <p className="cust-empty" style={{ marginBottom: 14 }}>No photos yet.</p>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
        <button className="cust-button-secondary" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Upload size={14} /> {uploading ? "Uploading…" : "Add photo"}
        </button>
      </div>
    </div>
  );
}

export default function SopPage({ user }: { user: CustomerUser }) {
  const [machines, setMachines] = useState<SopMachine[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function load() {
    fetchSops(user.organizationId).then(setMachines).catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }
  useEffect(load, [user.organizationId]);

  if (error) return <div className="cust-error">{error}</div>;
  if (!machines) return <p className="cust-empty">Loading standardized procedures…</p>;

  const selected = machines.find((m) => m.id === selectedId) ?? null;
  if (selected) {
    return <SopDetail machine={selected} user={user} onBack={() => setSelectedId(null)} onSaved={() => { setSelectedId(null); load(); }} />;
  }

  const documented = machines.filter((m) => m.sop && m.sop.steps.length > 0).length;

  return (
    <div>
      <p className="cust-empty" style={{ marginBottom: 18 }}>
        Standardized work: the same documented procedure for every machine of a given model, so maintenance
        doesn't depend on who happens to remember how it's done. {documented}/{machines.length} documented.
      </p>

      {machines.length === 0 ? (
        <p className="cust-empty">No machine models on file yet.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {machines.map((m) => {
            const done = Boolean(m.sop && m.sop.steps.length > 0);
            return (
              <button
                key={m.id}
                className="cust-card cust-card-clickable"
                onClick={() => setSelectedId(m.id)}
                style={{ textAlign: "left", border: "none", cursor: "pointer", width: "100%", font: "inherit", color: "inherit" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(36,31,66,0.62)", marginTop: 2 }}>
                      {m.brand}{m.category ? ` · ${m.category}` : ""}
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 12, fontWeight: 600, color: done ? "#15803d" : "rgba(36,31,66,0.5)" }}>
                  {done ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                  {done ? "Documented" : "Not documented yet"}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
