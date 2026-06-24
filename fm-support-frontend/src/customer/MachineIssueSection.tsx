import { useEffect, useRef, useState, type FormEvent } from "react";
import { createTicket, fetchMachineInstances, fetchMachines, uploadTicketAttachment } from "../api";
import type {
  AttachmentKind,
  CreateTicketResponse,
  CustomerUser,
  IssueType,
  Machine,
  MachineInstance,
  ProductLine,
} from "../types";
import { useLang, type TranslationKey } from "./i18n";
import DetailModal from "./DetailModal";
import CallTechnicianButton from "./CallTechnicianButton";

const ISSUE_TYPES: { value: IssueType; labelKey: TranslationKey }[] = [
  { value: "THREAD_BREAKING", labelKey: "issue.threadBreaking" },
  { value: "STITCH_SKIPPING", labelKey: "issue.stitchSkipping" },
  { value: "FABRIC_NOT_FEEDING", labelKey: "issue.fabricNotFeeding" },
];

export default function MachineIssueSection({
  user,
  productLine,
  introKey,
}: {
  user: CustomerUser;
  productLine: ProductLine;
  introKey: TranslationKey;
}) {
  const { t, lang } = useLang();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineId, setMachineId] = useState("");
  const [instances, setInstances] = useState<MachineInstance[] | null>(null);
  const [serialNumber, setSerialNumber] = useState("");
  const [issueType, setIssueType] = useState<IssueType>("THREAD_BREAKING");
  const [description, setDescription] = useState("");

  const [result, setResult] = useState<CreateTicketResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detailMachine, setDetailMachine] = useState<Machine | null>(null);

  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploadedAttachment, setUploadedAttachment] = useState<{ kind: AttachmentKind; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMachines(productLine, user.organizationId)
      .then((rows) => {
        setMachines(rows);
        setMachineId(rows.length > 0 ? rows[0].id : "");
      })
      .catch((err) => setError(err.message));
  }, [productLine, user.organizationId]);

  useEffect(() => {
    if (!machineId) {
      setInstances(null);
      setSerialNumber("");
      return;
    }
    setInstances(null);
    setSerialNumber("");
    fetchMachineInstances(machineId, user.organizationId)
      .then((rows) => {
        setInstances(rows);
        if (rows.length > 0) setSerialNumber(rows[0].serialNumber);
      })
      .catch((err) => setError(err.message));
  }, [machineId, user.organizationId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!machineId || !serialNumber || !description.trim()) return;

    setSubmitting(true);
    setError(null);
    setResult(null);
    setUploadedAttachment(null);
    try {
      const res = await createTicket({
        machineId,
        serialNumber,
        createdByUserId: user.id,
        issueType,
        description,
        lang,
      });
      setResult(res);

      if (attachmentFile) {
        setUploading(true);
        try {
          const updatedTicket = await uploadTicketAttachment(res.ticket.id, attachmentFile);
          const last = updatedTicket.attachments?.[updatedTicket.attachments.length - 1];
          if (last) setUploadedAttachment({ kind: last.kind, url: last.url });
        } catch {
          setError(t("machines.uploadFailed"));
        } finally {
          setUploading(false);
          setAttachmentFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p className="cust-empty" style={{ marginBottom: 18 }}>
        {t(introKey)}
      </p>

      {machines.length === 0 && (
        <div className="cust-locked-notice" style={{ marginBottom: 18 }}>
          {t("machines.noMachinesForFactory")}
        </div>
      )}

      <div className="cust-machine-grid">
        {machines.map((m) => (
          <div
            key={m.id}
            className={`cust-card cust-card-clickable cust-machine-option ${machineId === m.id ? "selected" : ""}`}
            onClick={() => setMachineId(m.id)}
          >
            {m.imageUrl && <img src={m.imageUrl} alt={m.name} />}
            <div className="cust-machine-option-name">{m.name}</div>
            <div className="cust-machine-option-model">{m.model}</div>
            <button
              className="cust-button-secondary cust-card-detail-btn"
              onClick={(e) => {
                e.stopPropagation();
                setDetailMachine(m);
              }}
            >
              {t("machines.viewDetails")}
            </button>
          </div>
        ))}
      </div>

      {detailMachine && (
        <DetailModal
          title={detailMachine.name}
          subtitle={detailMachine.model}
          images={detailMachine.images?.length ? detailMachine.images : detailMachine.imageUrl ? [detailMachine.imageUrl] : []}
          description={detailMachine.description}
          onClose={() => setDetailMachine(null)}
        >
          <button
            className="cust-button"
            onClick={() => {
              setMachineId(detailMachine.id);
              setDetailMachine(null);
            }}
          >
            {machineId === detailMachine.id ? t("machines.selected") : t("machines.selectThisMachine")}
          </button>
        </DetailModal>
      )}

      <form className="cust-card cust-form" onSubmit={handleSubmit}>
        <label>
          {t("machines.selectSerial")}
          {instances === null ? (
            <div className="cust-empty" style={{ marginTop: 6 }}>
              {t("machines.loadingSerials")}
            </div>
          ) : instances.length === 0 ? (
            <div className="cust-locked-notice" style={{ marginTop: 6 }}>
              {t("machines.noInstances")}
            </div>
          ) : (
            <select value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)}>
              {instances.map((mi) => (
                <option key={mi.id} value={mi.serialNumber}>
                  {mi.serialNumber}
                  {mi.location ? ` — ${mi.location}` : ""}
                </option>
              ))}
            </select>
          )}
        </label>

        <label>
          {t("machines.whatsProblem")}
          <select value={issueType} onChange={(e) => setIssueType(e.target.value as IssueType)}>
            {ISSUE_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("machines.describe")}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("machines.descriptionPlaceholder")}
            rows={4}
          />
        </label>

        <label>
          {t("machines.attachPhoto")}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {error && <div className="cust-error">{error}</div>}

        <button className="cust-button" type="submit" disabled={submitting || !serialNumber || !description.trim()}>
          {submitting ? t("machines.asking") : t("machines.askAi")}
        </button>
      </form>

      {result && (
        <div className="cust-card" style={{ marginTop: 20 }}>
          <h2 className="cust-section-title">{t("machines.aiSuggestion")}</h2>
          <div className="cust-ai-answer">{result.ticket.aiSuggestion?.text}</div>
          <div className="cust-ai-meta">
            {t("ai.ticketLabel")} {result.ticket.id} · {t("table.status")}: {result.ticket.status} ·{" "}
            {result.ticket.aiSuggestion?.fromCache ? t("ai.fromCache") : t("ai.usedCredit")} ·{" "}
            {result.remainingCredits} {t("ai.creditsRemaining")}
          </div>

          {uploading && <p className="cust-empty">{t("machines.uploading")}</p>}
          {uploadedAttachment && (
            <div style={{ marginTop: 12 }}>
              {uploadedAttachment.kind === "image" ? (
                <img src={uploadedAttachment.url} alt="Attachment" style={{ maxWidth: 240, borderRadius: 10 }} />
              ) : (
                <video src={uploadedAttachment.url} controls style={{ maxWidth: 240, borderRadius: 10 }} />
              )}
            </div>
          )}

          <p className="cust-empty" style={{ marginTop: 14, marginBottom: 0 }}>
            {t("support.stillNeedHelp")}
          </p>
          <CallTechnicianButton />
        </div>
      )}
    </div>
  );
}
