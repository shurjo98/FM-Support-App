import { useEffect, useState } from "react";
import { fetchMyApprovals, fetchOrganizations, submitApproval, uploadWarrantyAttachment, UnauthorizedError } from "../api";
import type { ApprovalRequestLite, ApprovalType, FactoryAccount, InternalAccountLite } from "../types";
import { Plus, MonitorPlay, CalendarOff, Percent, UtensilsCrossed, Wrench, Paperclip, type LucideIcon } from "lucide-react";

const TYPE_META: { key: ApprovalType; label: string; icon: LucideIcon }[] = [
  { key: "demo", label: "Demo Approval", icon: MonitorPlay },
  { key: "leave", label: "Leave Request", icon: CalendarOff },
  { key: "discount", label: "Discount Approval", icon: Percent },
  { key: "qingke", label: "Hospitality (Qingke)", icon: UtensilsCrossed },
  { key: "warranty", label: "Warranty & Repair (Baoxiu)", icon: Wrench },
];

export function StatusPill({ status }: { status: ApprovalRequestLite["status"] }) {
  const cls = status === "APPROVED" ? "approved" : status === "REJECTED" ? "rejected" : "pending";
  return <span className={`approval-status-pill ${cls}`}>{status}</span>;
}

export default function ApprovalsPage({
  token,
  actingAccount,
  onUnauthorized,
}: {
  token: string;
  actingAccount: InternalAccountLite;
  onUnauthorized: () => void;
}) {
  const [requests, setRequests] = useState<ApprovalRequestLite[] | null>(null);
  const [organizations, setOrganizations] = useState<FactoryAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState<ApprovalType | null>(null);

  function load() {
    Promise.all([fetchMyApprovals(token, actingAccount.id), fetchOrganizations(token)])
      .then(([r, o]) => {
        setRequests(r);
        setOrganizations(o);
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) return onUnauthorized();
        setError(err.message);
      });
  }

  useEffect(load, [token, actingAccount.id]);

  if (error) return <div className="page-error">{error}</div>;
  if (!requests) return <div className="page-loading">Loading approvals...</div>;

  return (
    <div className="kanban-page">
      <div className="kanban-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Approvals</h2>
          <span style={{ fontSize: "0.75rem", color: "#6b7280", background: "#f3f4f6", borderRadius: 999, padding: "2px 10px" }}>
            {requests.filter((r) => r.status === "PENDING").length} pending
          </span>
        </div>
      </div>

      <div className="approval-type-picker">
        {TYPE_META.map((t) => (
          <button key={t.key} className="approval-type-card" onClick={() => setShowNew(t.key)}>
            <t.icon size={20} strokeWidth={2} />
            <span>{t.label}</span>
            <Plus size={14} strokeWidth={2.5} className="approval-type-card-plus" />
          </button>
        ))}
      </div>

      <h3 className="int-section-heading">My requests</h3>
      <div className="int-modal-fields team-hub-card">
        <div className="team-roster-list">
          {requests.length === 0 && <p className="empty">You haven't submitted any requests yet.</p>}
          {requests.map((r) => (
            <div key={`${r.type}-${r.id}`} className="team-roster-row">
              <div className="team-roster-name">
                {r.label}
                <div className="team-roster-skills">{r.summary}</div>
              </div>
              <span className="role-badges-list team-roster-roles">
                <StatusPill status={r.status} />
              </span>
              <div className="team-roster-actions approval-list-date">{new Date(r.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>

      {showNew && (
        <NewApprovalModal
          token={token}
          type={showNew}
          actingAccountId={actingAccount.id}
          organizations={organizations}
          onClose={() => setShowNew(null)}
          onCreated={() => {
            setShowNew(null);
            load();
          }}
        />
      )}
    </div>
  );
}

const LEAVE_TYPES = ["Annual", "Sick", "Casual", "Other"];
const CLAIM_TYPES = ["Warranty", "Paid Repair"];

function NewApprovalModal({
  token,
  type,
  actingAccountId,
  organizations,
  onClose,
  onCreated,
}: {
  token: string;
  type: ApprovalType;
  actingAccountId: string;
  organizations: FactoryAccount[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const meta = TYPE_META.find((t) => t.key === type)!;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demo
  const [prospectCompany, setProspectCompany] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [machineOrProduct, setMachineOrProduct] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [location, setLocation] = useState("");
  const [purpose, setPurpose] = useState("");

  // Leave
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0]!);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  // Discount
  const [organizationId, setOrganizationId] = useState("");
  const [itemOrQuoteDescription, setItemOrQuoteDescription] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");

  // Qingke
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [amount, setAmount] = useState("");
  const [attendees, setAttendees] = useState("");

  // Warranty
  const [serialNumber, setSerialNumber] = useState("");
  const [customMachineName, setCustomMachineName] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [claimType, setClaimType] = useState(CLAIM_TYPES[0]!);
  const [files, setFiles] = useState<File[]>([]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      let payload: Record<string, unknown>;
      switch (type) {
        case "demo":
          payload = { prospectCompany, contactPerson, contactPhone, machineOrProduct, proposedDate, location, purpose };
          break;
        case "leave":
          payload = { leaveType, startDate, endDate, reason };
          break;
        case "discount":
          payload = {
            organizationId,
            itemOrQuoteDescription,
            originalAmount: originalAmount ? Number(originalAmount) : undefined,
            discountPercent: discountPercent ? Number(discountPercent) : undefined,
            discountAmount: discountAmount ? Number(discountAmount) : undefined,
            reason,
          };
          break;
        case "qingke":
          payload = { organizationId: organizationId || undefined, venue, eventDate, amount: amount ? Number(amount) : undefined, attendees, purpose };
          break;
        case "warranty":
          payload = { organizationId, serialNumber, customMachineName, issueDescription, claimType };
          break;
      }

      const created = await submitApproval(token, type, { ...payload, actingAccountId });

      if (type === "warranty" && files.length) {
        for (const file of files) {
          await uploadWarrantyAttachment(token, created.id, file);
        }
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="int-modal-overlay" onClick={onClose}>
      <div className="int-modal" onClick={(e) => e.stopPropagation()}>
        <button className="int-modal-close" onClick={onClose}>
          ✕
        </button>
        <h2 className="int-modal-title">
          <meta.icon size={18} strokeWidth={2} style={{ verticalAlign: "-3px", marginRight: 8 }} />
          {meta.label}
        </h2>

        <div className="int-modal-fields">
          {type === "demo" && (
            <>
              <label>
                Prospect company <span style={{ color: "#dc2626" }}>*</span>
                <input value={prospectCompany} onChange={(e) => setProspectCompany(e.target.value)} placeholder="e.g. Evergreen Garments Ltd" autoFocus />
              </label>
              <label>
                Machine / product to demo <span style={{ color: "#dc2626" }}>*</span>
                <input value={machineOrProduct} onChange={(e) => setMachineOrProduct(e.target.value)} placeholder="e.g. A60 computerized panel" />
              </label>
              <label>
                Contact person
                <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
              </label>
              <label>
                Contact phone
                <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </label>
              <label>
                Proposed date
                <input type="date" value={proposedDate} onChange={(e) => setProposedDate(e.target.value)} />
              </label>
              <label>
                Location
                <input value={location} onChange={(e) => setLocation(e.target.value)} />
              </label>
              <label>
                Purpose / notes
                <textarea rows={2} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
              </label>
            </>
          )}

          {type === "leave" && (
            <>
              <label>
                Leave type
                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Start date <span style={{ color: "#dc2626" }}>*</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label>
                End date <span style={{ color: "#dc2626" }}>*</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
              <label>
                Reason
                <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
            </>
          )}

          {type === "discount" && (
            <>
              <label>
                Factory <span style={{ color: "#dc2626" }}>*</span>
                <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
                  <option value="">Select factory</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Item / quote description <span style={{ color: "#dc2626" }}>*</span>
                <input value={itemOrQuoteDescription} onChange={(e) => setItemOrQuoteDescription(e.target.value)} placeholder="e.g. 20x needle packs, Q3 order" />
              </label>
              <label>
                Original amount (৳) <span style={{ color: "#dc2626" }}>*</span>
                <input type="number" min={0} value={originalAmount} onChange={(e) => setOriginalAmount(e.target.value)} />
              </label>
              <label>
                Discount %
                <input type="number" min={0} max={100} value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} />
              </label>
              <label>
                Discount amount (৳)
                <input type="number" min={0} value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
              </label>
              <label>
                Reason
                <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
            </>
          )}

          {type === "qingke" && (
            <>
              <label>
                Factory / client (optional)
                <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
                  <option value="">No factory</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Venue
                <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Spice House, Gulshan" />
              </label>
              <label>
                Date
                <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </label>
              <label>
                Amount (৳) <span style={{ color: "#dc2626" }}>*</span>
                <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              <label>
                Attendees
                <input value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="e.g. 2x FM staff, 3x client" />
              </label>
              <label>
                Purpose
                <textarea rows={2} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
              </label>
            </>
          )}

          {type === "warranty" && (
            <>
              <label>
                Factory <span style={{ color: "#dc2626" }}>*</span>
                <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
                  <option value="">Select factory</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Claim type
                <select value={claimType} onChange={(e) => setClaimType(e.target.value)}>
                  {CLAIM_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Serial number
                <input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
              </label>
              <label>
                Machine name (if not in catalog)
                <input value={customMachineName} onChange={(e) => setCustomMachineName(e.target.value)} />
              </label>
              <label>
                Issue description <span style={{ color: "#dc2626" }}>*</span>
                <textarea rows={3} value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} placeholder="What's wrong with the machine, when it started, etc." />
              </label>
              <label>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Paperclip size={14} strokeWidth={2} /> Photos / documents
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
                />
              </label>
            </>
          )}

          {error && <div className="login-error">{error}</div>}

          <button className="int-button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit for GM approval"}
          </button>
        </div>
      </div>
    </div>
  );
}
