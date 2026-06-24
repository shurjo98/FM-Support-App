import { useState, type FormEvent } from "react";
import { addTicketComment } from "../api";
import type { CustomerTicket, CustomerUser, TicketEventType } from "../types";
import { useLang } from "./i18n";

const EVENT_ICON: Record<TicketEventType, string> = {
  RAISED: "🟢",
  ASSIGNED: "👤",
  STATUS_CHANGED: "🔄",
  COMMENT: "💬",
  ATTACHMENT: "📎",
};

export default function TicketTimeline({
  ticket,
  user,
  onUpdated,
}: {
  ticket: CustomerTicket;
  user: CustomerUser;
  onUpdated: (updated: CustomerTicket) => void;
}) {
  const { t } = useLang();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await addTicketComment(ticket.id, user.id, text.trim());
      onUpdated(updated);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  const events = (ticket.events ?? []).slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="cust-timeline">
      {ticket.attachments && ticket.attachments.length > 0 && (
        <div className="cust-timeline-attachments">
          {ticket.attachments.map((att) =>
            att.kind === "image" ? (
              <img key={att.id} src={att.url} alt="Attachment" />
            ) : (
              <video key={att.id} src={att.url} controls />
            )
          )}
        </div>
      )}

      {events.map((ev) => (
        <div className="cust-timeline-item" key={ev.id}>
          <span className="cust-timeline-icon">{EVENT_ICON[ev.type]}</span>
          <div>
            <div className="cust-timeline-desc">{ev.description}</div>
            <div className="cust-timeline-meta">
              {ev.authorName ? `${ev.authorName} · ` : ""}
              {new Date(ev.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      ))}

      <form className="cust-timeline-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("tickets.commentPlaceholder")}
        />
        <button className="cust-button-secondary" type="submit" disabled={submitting || !text.trim()}>
          {submitting ? t("tickets.posting") : t("tickets.postComment")}
        </button>
      </form>
      {error && <div className="cust-error">{error}</div>}
    </div>
  );
}
