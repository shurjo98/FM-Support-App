import { useEffect, useState } from "react";
import {
  createOrganization,
  fetchOrganizations,
  updateOrganization,
  fetchMachines,
  assignMachineToFactory,
  UnauthorizedError,
} from "../api";
import type { FactoryAccount, InternalAccountLite, Machine } from "../types";
import { REGIONS } from "../types";
import { canManageTasks } from "../permissions";

export default function FactoriesPage({
  token,
  actingAccount,
  onUnauthorized,
}: {
  token: string;
  actingAccount: InternalAccountLite;
  onUnauthorized: () => void;
}) {
  const [factories, setFactories] = useState<FactoryAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<FactoryAccount | null>(null);
  const [managingMachines, setManagingMachines] = useState<FactoryAccount | null>(null);

  const canManage = canManageTasks(actingAccount);

  function load() {
    fetchOrganizations(token)
      .then(setFactories)
      .catch((err) => {
        if (err instanceof UnauthorizedError) return onUnauthorized();
        setError(err.message);
      });
  }

  useEffect(load, [token]);

  if (error) return <div className="page-error">{error}</div>;

  return (
    <div>
      <div className="kanban-toolbar">
        <p className="empty" style={{ margin: 0 }}>
          Factories used for the portal login and Task Board search/region filter.
        </p>
        {canManage && (
          <button className="int-button" onClick={() => setShowAdd(true)}>
            + Add factory
          </button>
        )}
      </div>

      <div className="int-modal-fields team-hub-card">
        <div className="team-roster-list">
          {factories.length === 0 && <p className="empty">No factories yet.</p>}
          {factories.map((f) => (
            <div key={f.id} className="team-roster-row">
              <div className="team-roster-name">
                {f.name}
                <div className="team-roster-skills">
                  {f.location ?? "No location set"}
                  {f.region ? ` · ${f.region}` : ""}
                </div>
              </div>
              <span className="role-badges-list team-roster-roles">
                {f.hasCredentials ? `Portal login: ${f.portalUserId}` : "No portal login set"}
              </span>
              {canManage && (
                <div className="team-roster-actions">
                  <button className="int-button-secondary" onClick={() => setManagingMachines(f)}>
                    Manage machines
                  </button>
                  <button className="int-button-secondary" onClick={() => setEditing(f)}>
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showAdd && (
        <FactoryModal
          token={token}
          actingAccountId={actingAccount.id}
          onClose={() => setShowAdd(false)}
          onSaved={(factory) => {
            setFactories((prev) => [...prev, factory]);
            setShowAdd(false);
          }}
        />
      )}

      {editing && (
        <FactoryModal
          token={token}
          actingAccountId={actingAccount.id}
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={(factory) => {
            setFactories((prev) => prev.map((f) => (f.id === factory.id ? factory : f)));
            setEditing(null);
          }}
        />
      )}

      {managingMachines && (
        <FactoryMachinesModal
          token={token}
          factory={managingMachines}
          onClose={() => setManagingMachines(null)}
        />
      )}
    </div>
  );
}

function FactoryModal({
  token,
  actingAccountId,
  existing,
  onClose,
  onSaved,
}: {
  token: string;
  actingAccountId: string;
  existing?: FactoryAccount;
  onClose: () => void;
  onSaved: (factory: FactoryAccount) => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [location, setLocation] = useState(existing?.location ?? "");
  const [region, setRegion] = useState(existing?.region ?? "");
  const [portalUserId, setPortalUserId] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(existing);

  async function handleSubmit() {
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const factory = isEdit && existing
        ? await updateOrganization(token, existing.id, {
            name: name.trim(),
            location: location.trim(),
            region,
            ...(portalUserId.trim() ? { portalUserId: portalUserId.trim() } : {}),
            ...(portalPassword.trim() ? { portalPassword: portalPassword.trim() } : {}),
            actingAccountId,
          })
        : await createOrganization(token, {
            name: name.trim(),
            location: location.trim(),
            region,
            actingAccountId,
          });

      onSaved(factory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save factory");
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
        <h2 className="int-modal-title">{isEdit ? "Edit factory" : "Add a factory"}</h2>
        <div className="int-modal-fields">
          <label>
            Name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Delmas Factory" />
          </label>

          <label>
            Location (free text)
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Ashulia, Dhaka"
            />
          </label>

          <label>
            Region
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">No region</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <label>
            Portal login ID {isEdit && <span style={{ fontWeight: 400, color: "#9ca3af" }}>(leave blank to keep current)</span>}
            <input
              type="text"
              value={portalUserId}
              onChange={(e) => setPortalUserId(e.target.value)}
              placeholder={isEdit ? "unchanged" : "e.g. delmas"}
            />
          </label>
          <label>
            Portal password {isEdit && <span style={{ fontWeight: 400, color: "#9ca3af" }}>(leave blank to keep current)</span>}
            <input
              type="text"
              value={portalPassword}
              onChange={(e) => setPortalPassword(e.target.value)}
              placeholder={isEdit ? "unchanged" : "e.g. delmas123"}
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button className="int-button" onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting ? "Saving..." : isEdit ? "Save changes" : "Add factory"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Lets staff attach a real FM catalog machine (photo + manual-backed
// troubleshooting already loaded) to this factory under a real serial
// number — this is what makes a freshly onboarded client's Sewing/Automated
// Machines pages show anything at all, instead of just the customer's own
// "My Equipment" (other-brand) registrations.
function FactoryMachinesModal({
  token,
  factory,
  onClose,
}: {
  token: string;
  factory: FactoryAccount;
  onClose: () => void;
}) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineId, setMachineId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<{ model: string; serialNumber: string }[]>([]);

  useEffect(() => {
    fetchMachines()
      .then((rows) => {
        setMachines(rows);
        setMachineId(rows.length > 0 ? rows[0].id : "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load machine catalog"));
  }, []);

  const sewing = machines.filter((m) => m.productLine === "SEWING");
  const automated = machines.filter((m) => m.productLine === "AUTOMATED");

  async function handleAdd() {
    if (!machineId || !serialNumber.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await assignMachineToFactory(token, machineId, {
        organizationId: factory.id,
        serialNumber: serialNumber.trim(),
        ...(location.trim() ? { location: location.trim() } : {}),
      });
      const model = machines.find((m) => m.id === machineId)?.model ?? machineId;
      setJustAdded((prev) => [...prev, { model, serialNumber: serialNumber.trim() }]);
      setSerialNumber("");
      setLocation("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign machine");
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
        <h2 className="int-modal-title">Manage machines — {factory.name}</h2>
        <div className="int-modal-fields">
          <label>
            Machine model
            <select value={machineId} onChange={(e) => setMachineId(e.target.value)}>
              {sewing.length > 0 && (
                <optgroup label="Sewing Machines">
                  {sewing.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.model} — {m.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {automated.length > 0 && (
                <optgroup label="Automated Machines">
                  {automated.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.model} — {m.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>

          <label>
            Serial number
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="e.g. SHG-A-001"
            />
          </label>

          <label>
            Location (optional)
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Line A"
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button className="int-button" onClick={handleAdd} disabled={submitting || !machineId || !serialNumber.trim()}>
            {submitting ? "Adding..." : "+ Add machine"}
          </button>

          {justAdded.length > 0 && (
            <div className="team-roster-list" style={{ marginTop: 12 }}>
              {justAdded.map((a, i) => (
                <div key={i} className="team-roster-row">
                  <div className="team-roster-name">
                    {a.model}
                    <div className="team-roster-skills">{a.serialNumber}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
