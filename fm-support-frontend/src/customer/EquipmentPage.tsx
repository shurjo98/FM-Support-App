import { useEffect, useState } from "react";
import { Plus, Wrench, X, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import {
  createTicket,
  fetchMyEquipment,
  markMachineServiced,
  registerCustomMachine,
  updateMachineInstance,
} from "../api";
import type { CustomerUser, EquipmentItem, IssueType } from "../types";
import { useLang } from "./i18n";

const ISSUE_TYPES: { value: IssueType; label: string }[] = [
  { value: "THREAD_BREAKING", label: "Thread breaking" },
  { value: "STITCH_SKIPPING", label: "Stitch skipping" },
  { value: "FABRIC_NOT_FEEDING", label: "Fabric not feeding" },
];

const SERVICE_BADGE: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  ok: { label: "Serviced recently", className: "equip-badge-ok", icon: CheckCircle2 },
  due_soon: { label: "Service due soon", className: "equip-badge-due", icon: Clock },
  overdue: { label: "Service overdue", className: "equip-badge-overdue", icon: AlertTriangle },
  unscheduled: { label: "No maintenance schedule", className: "equip-badge-unscheduled", icon: Clock },
};

export default function EquipmentPage({ user }: { user: CustomerUser }) {
  const { lang } = useLang();
  const [items, setItems] = useState<EquipmentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [ticketFor, setTicketFor] = useState<EquipmentItem | null>(null);

  function load() {
    fetchMyEquipment(user.organizationId)
      .then(setItems)
      .catch((err) => setError(err.message));
  }

  useEffect(load, [user.organizationId]);

  async function handleMarkServiced(id: string) {
    try {
      await markMachineServiced(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update service record");
    }
  }

  async function handleSetInterval(id: string, months: number) {
    try {
      await updateMachineInstance(id, { serviceIntervalMonths: months });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set maintenance schedule");
    }
  }

  if (error) return <div className="cust-error">{error}</div>;
  if (!items) return <p className="cust-empty">Loading your equipment...</p>;

  return (
    <div>
      <p className="cust-empty" style={{ marginBottom: 18 }}>
        Got machines from other brands on your production line too? Register them here to raise
        issues against them and keep track of maintenance — your Jack machines already have their
        own pages under Sewing Machines and Automated Machines.
      </p>

      <button className="cust-button" onClick={() => setShowAdd(true)} style={{ marginBottom: 20 }}>
        <Plus size={16} /> Add a machine
      </button>

      {items.length === 0 ? (
        <p className="cust-empty">No equipment registered yet. Add your first machine above.</p>
      ) : (
        <div className="equip-grid">
          {items.map((item) => {
            const badge = SERVICE_BADGE[item.serviceStatus];
            return (
              <div key={item.id} className="cust-card equip-card">
                <div className="equip-card-top">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.displayName} className="equip-card-img" />
                  ) : (
                    <div className="equip-card-icon">
                      <Wrench size={24} />
                    </div>
                  )}
                  <div>
                    <div className="equip-card-name">{item.displayName}</div>
                    <div className="equip-card-meta">
                      {item.displayBrand}
                      {item.displayCategory ? ` · ${item.displayCategory}` : ""}
                      {!item.isCatalogMachine && " · Custom"}
                    </div>
                    <div className="equip-card-serial">SN: {item.serialNumber}</div>
                  </div>
                </div>

                <span className={`equip-badge ${badge.className}`}>
                  <badge.icon size={13} />
                  {badge.label}
                  {item.nextServiceDue && item.serviceStatus !== "unscheduled"
                    ? ` — next due ${new Date(item.nextServiceDue).toLocaleDateString()}`
                    : ""}
                </span>

                <div className="equip-card-actions">
                  <button className="cust-button-secondary" onClick={() => setTicketFor(item)}>
                    Report an issue
                  </button>
                  {item.serviceIntervalMonths ? (
                    <button className="cust-button-secondary" onClick={() => handleMarkServiced(item.id)}>
                      Mark serviced today
                    </button>
                  ) : (
                    <button className="cust-button-secondary" onClick={() => handleSetInterval(item.id, 6)}>
                      Set 6-month reminder
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddMachineModal
          organizationId={user.organizationId}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}

      {ticketFor && (
        <ReportIssueModal
          item={ticketFor}
          user={user}
          lang={lang}
          onClose={() => setTicketFor(null)}
          onCreated={() => setTicketFor(null)}
        />
      )}
    </div>
  );
}

function AddMachineModal({
  organizationId,
  onClose,
  onAdded,
}: {
  organizationId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [brand, setBrand] = useState("");
  const [customName, setCustomName] = useState("");
  const [category, setCategory] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!brand.trim() || !customName.trim() || !serialNumber.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await registerCustomMachine({
        organizationId,
        serialNumber: serialNumber.trim(),
        brand: brand.trim(),
        customName: customName.trim(),
        category: category.trim() || undefined,
        location: location.trim() || undefined,
      });
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add machine");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="cust-modal-overlay" onClick={onClose}>
      <div className="cust-modal" onClick={(e) => e.stopPropagation()}>
        <button className="cust-modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <h2 className="cust-modal-title">Add a machine</h2>
        <p className="cust-empty" style={{ marginBottom: 14 }}>
          Any brand — this doesn't need to be a Jack machine.
        </p>

        <div className="cust-form">
          <label>
            Brand
            <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Brother, Juki, Singer" />
          </label>
          <label>
            Model / Name
            <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. DDL-8700" />
          </label>
          <label>
            Category
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Lockstitch, Embroidery, Cutting" />
          </label>
          <label>
            Serial number
            <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Machine's serial number" />
          </label>
          <label>
            Location (optional)
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Line 2" />
          </label>

          {error && <div className="cust-error">{error}</div>}

          <button
            className="cust-button"
            onClick={handleSubmit}
            disabled={submitting || !brand.trim() || !customName.trim() || !serialNumber.trim()}
          >
            {submitting ? "Adding..." : "Add machine"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportIssueModal({
  item,
  user,
  lang,
  onClose,
  onCreated,
}: {
  item: EquipmentItem;
  user: CustomerUser;
  lang: "en" | "bn";
  onClose: () => void;
  onCreated: () => void;
}) {
  const [issueType, setIssueType] = useState<IssueType>("THREAD_BREAKING");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createTicket({
        serialNumber: item.serialNumber,
        createdByUserId: user.id,
        issueType,
        description: description.trim(),
        lang,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit ticket");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="cust-modal-overlay" onClick={onClose}>
      <div className="cust-modal" onClick={(e) => e.stopPropagation()}>
        <button className="cust-modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <h2 className="cust-modal-title">Report an issue</h2>
        <p className="cust-empty" style={{ marginBottom: 14 }}>
          {item.displayName} ({item.displayBrand}) — SN: {item.serialNumber}
        </p>

        {done ? (
          <div className="cust-card" style={{ background: "rgba(34,197,94,0.1)" }}>
            Ticket submitted — the team's been notified, and you can track it under Ticket History.
            <div style={{ marginTop: 12 }}>
              <button className="cust-button" onClick={onCreated}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="cust-form">
            <label>
              What's the problem?
              <select value={issueType} onChange={(e) => setIssueType(e.target.value as IssueType)}>
                {ISSUE_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Describe it
              <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>

            {error && <div className="cust-error">{error}</div>}

            <button className="cust-button" onClick={handleSubmit} disabled={submitting || !description.trim()}>
              {submitting ? "Submitting..." : "Submit ticket"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
