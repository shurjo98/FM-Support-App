import { useEffect, useState } from "react";
import { decideApproval, fetchApprovalInbox, UnauthorizedError } from "../api";
import type {
  ApprovalRequestLite,
  DemoApprovalDetail,
  DiscountApprovalDetail,
  HospitalityApprovalDetail,
  LeaveRequestDetail,
  WarrantyClaimDetail,
} from "../types";
import { Check, X, Paperclip } from "lucide-react";
import { StatusPill } from "./ApprovalsPage";

export default function GmPortalPage({
  token,
  actingAccountId,
  onUnauthorized,
}: {
  token: string;
  actingAccountId: string;
  onUnauthorized: () => void;
}) {
  const [inbox, setInbox] = useState<ApprovalRequestLite[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ApprovalRequestLite | null>(null);

  function load() {
    fetchApprovalInbox(token, actingAccountId)
      .then(setInbox)
      .catch((err) => {
        if (err instanceof UnauthorizedError) return onUnauthorized();
        setError(err.message);
      });
  }

  useEffect(load, [token, actingAccountId]);

  if (error) return <div className="page-error">{error}</div>;
  if (!inbox) return <div className="page-loading">Loading GM Portal...</div>;

  return (
    <div className="kanban-page">
      <div className="kanban-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>GM Portal</h2>
          <span style={{ fontSize: "0.75rem", color: "#6b7280", background: "#f3f4f6", borderRadius: 999, padding: "2px 10px" }}>
            {inbox.length} awaiting your sign-off
          </span>
        </div>
      </div>

      <div className="int-modal-fields team-hub-card">
        <div className="team-roster-list">
          {inbox.length === 0 && <p className="empty">Nothing pending — you're all caught up.</p>}
          {inbox.map((r) => (
            <button key={`${r.type}-${r.id}`} className="team-roster-row approval-inbox-row" onClick={() => setSelected(r)}>
              <div className="team-roster-name">
                {r.label}
                <div className="team-roster-skills">{r.summary}</div>
              </div>
              <span className="role-badges-list team-roster-roles">
                {r.requestedByName} · {new Date(r.createdAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <DecisionModal
          token={token}
          actingAccountId={actingAccountId}
          request={selected}
          onClose={() => setSelected(null)}
          onDecided={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function DetailRows({ request }: { request: ApprovalRequestLite }) {
  switch (request.type) {
    case "demo": {
      const d = request.detail as DemoApprovalDetail;
      return (
        <>
          <Row label="Prospect company" value={d.prospectCompany} />
          <Row label="Machine / product" value={d.machineOrProduct} />
          <Row label="Contact" value={[d.contactPerson, d.contactPhone].filter(Boolean).join(" · ")} />
          <Row label="Proposed date" value={d.proposedDate} />
          <Row label="Location" value={d.location} />
          <Row label="Purpose" value={d.purpose} />
        </>
      );
    }
    case "leave": {
      const d = request.detail as LeaveRequestDetail;
      return (
        <>
          <Row label="Leave type" value={d.leaveType} />
          <Row label="Dates" value={`${d.startDate} → ${d.endDate}`} />
          <Row label="Reason" value={d.reason} />
        </>
      );
    }
    case "discount": {
      const d = request.detail as DiscountApprovalDetail;
      return (
        <>
          <Row label="Factory" value={d.organizationName} />
          <Row label="Item / quote" value={d.itemOrQuoteDescription} />
          <Row label="Original amount" value={`৳${d.originalAmount}`} />
          <Row label="Discount" value={d.discountPercent ? `${d.discountPercent}%` : d.discountAmount ? `৳${d.discountAmount}` : null} />
          <Row label="Reason" value={d.reason} />
        </>
      );
    }
    case "qingke": {
      const d = request.detail as HospitalityApprovalDetail;
      return (
        <>
          <Row label="Factory / client" value={d.organizationName} />
          <Row label="Venue" value={d.venue} />
          <Row label="Date" value={d.eventDate} />
          <Row label="Amount" value={`৳${d.amount}`} />
          <Row label="Attendees" value={d.attendees} />
          <Row label="Purpose" value={d.purpose} />
        </>
      );
    }
    case "warranty": {
      const d = request.detail as WarrantyClaimDetail;
      return (
        <>
          <Row label="Factory" value={d.organizationName} />
          <Row label="Claim type" value={d.claimType} />
          <Row label="Machine" value={d.customMachineName ?? d.serialNumber} />
          <Row label="Issue" value={d.issueDescription} />
          {d.attachments.length > 0 && (
            <div>
              <strong>Attachments:</strong>
              <div className="approval-attachment-list">
                {d.attachments.map((a) => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="approval-attachment-chip">
                    <Paperclip size={12} strokeWidth={2} />
                    {a.mimeType.startsWith("image/") ? "Photo" : "Document"}
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      );
    }
  }
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <strong>{label}:</strong> {value}
    </div>
  );
}

function DecisionModal({
  token,
  actingAccountId,
  request,
  onClose,
  onDecided,
}: {
  token: string;
  actingAccountId: string;
  request: ApprovalRequestLite;
  onClose: () => void;
  onDecided: () => void;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "APPROVED" | "REJECTED") {
    setSubmitting(true);
    setError(null);
    try {
      await decideApproval(token, request.type, request.id, decision, note.trim() || undefined, actingAccountId);
      onDecided();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record decision");
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
        <h2 className="int-modal-title">{request.label}</h2>
        <div className="int-modal-meta">
          Submitted by {request.requestedByName} · {new Date(request.createdAt).toLocaleString()} <StatusPill status={request.status} />
        </div>

        <div className="int-modal-fields">
          <DetailRows request={request} />

          <label>
            Note (optional)
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for your decision..." />
          </label>

          {error && <div className="login-error">{error}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <button className="int-button" onClick={() => decide("APPROVED")} disabled={submitting} style={{ display: "flex", alignItems: "center", gap: 6, background: "#16a34a" }}>
              <Check size={16} strokeWidth={2.5} /> Approve
            </button>
            <button className="int-button-danger" onClick={() => decide("REJECTED")} disabled={submitting} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <X size={16} strokeWidth={2.5} /> Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
