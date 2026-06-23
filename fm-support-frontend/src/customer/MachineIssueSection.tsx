import { useEffect, useState, type FormEvent } from "react";
import { createTicket, fetchMachines } from "../api";
import type { CreateTicketResponse, CustomerUser, IssueType, Machine, ProductLine } from "../types";

const ISSUE_TYPES: { value: IssueType; label: string }[] = [
  { value: "THREAD_BREAKING", label: "Thread Breaking" },
  { value: "STITCH_SKIPPING", label: "Stitch Skipping" },
  { value: "FABRIC_NOT_FEEDING", label: "Fabric Not Feeding" },
];

export default function MachineIssueSection({
  user,
  productLine,
  intro,
}: {
  user: CustomerUser;
  productLine: ProductLine;
  intro: string;
}) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineId, setMachineId] = useState("");
  const [issueType, setIssueType] = useState<IssueType>("THREAD_BREAKING");
  const [description, setDescription] = useState("");

  const [result, setResult] = useState<CreateTicketResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMachines(productLine)
      .then((rows) => {
        setMachines(rows);
        if (rows.length > 0) setMachineId(rows[0].id);
      })
      .catch((err) => setError(err.message));
  }, [productLine]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!machineId || !description.trim()) return;

    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await createTicket({
        machineId,
        createdByUserId: user.id,
        issueType,
        description,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p className="cust-empty" style={{ marginBottom: 18 }}>
        {intro}
      </p>

      <div className="cust-machine-grid">
        {machines.map((m) => (
          <div
            key={m.id}
            className={`cust-card ${user.role === "IE" ? "cust-card-clickable" : ""} cust-machine-option ${
              machineId === m.id ? "selected" : ""
            }`}
            onClick={() => user.role === "IE" && setMachineId(m.id)}
          >
            {m.imageUrl && <img src={m.imageUrl} alt={m.name} />}
            <div className="cust-machine-option-name">{m.name}</div>
            <div className="cust-machine-option-model">{m.model}</div>
          </div>
        ))}
      </div>

      {user.role !== "IE" ? (
        <div className="cust-locked-notice">
          Only your factory's Industrial Engineer (IE) can raise machine issues. Please contact
          your IE to report this problem — operators can browse machines here but can't submit
          tickets.
        </div>
      ) : (
        <>
          <form className="cust-card cust-form" onSubmit={handleSubmit}>
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
              Describe it in your own words
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. The machine keeps skipping stitches whenever I sew denim fabric"
                rows={4}
              />
            </label>

            {error && <div className="cust-error">{error}</div>}

            <button className="cust-button" type="submit" disabled={submitting || !description.trim()}>
              {submitting ? "Asking AI..." : "Ask AI for help"}
            </button>
          </form>

          {result && (
            <div className="cust-card" style={{ marginTop: 20 }}>
              <h2 className="cust-section-title">AI Suggestion</h2>
              <div className="cust-ai-answer">{result.ticket.aiSuggestion?.text}</div>
              <div className="cust-ai-meta">
                Ticket {result.ticket.id} · Status: {result.ticket.status} ·{" "}
                {result.ticket.aiSuggestion?.fromCache
                  ? "Answered from cache (free)"
                  : "Answered using 1 AI credit"}{" "}
                · {result.remainingCredits} credits remaining
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
