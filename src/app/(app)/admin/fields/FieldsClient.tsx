"use client";

import { useState } from "react";
import { createField, updateField, deleteField } from "./actions";

interface IFieldDefinition {
  id: number;
  entityType: "opportunity" | "company" | "contact";
  key: string;
  label: string;
  fieldType: "text" | "number" | "date" | "currency" | "boolean" | "select";
  options: string[] | null;
  required: boolean;
  sortOrder: number;
}

const ENTITY_LABELS: Record<string, string> = {
  opportunity: "Opportunities",
  company: "Companies",
  contact: "Contacts"
};

export default function FieldsClient({ fields }: { fields: IFieldDefinition[] }) {
  const [activeEntity, setActiveEntity] = useState<"opportunity" | "company" | "contact">("opportunity");
  const [editing, setEditing] = useState<IFieldDefinition | null>(null);
  const [showNew, setShowNew] = useState(false);

  const visibleFields = fields.filter(f => f.entityType === activeEntity);

  return (
    <div>
      <div className="admin-tabs" style={{ borderBottom: "none", marginBottom: 12 }}>
        {(["opportunity", "company", "contact"] as const).map(e => (
          <button
            key={e}
            className={activeEntity === e ? "secondary" : "link-button"}
            style={{ marginRight: 8 }}
            onClick={() => setActiveEntity(e)}
          >
            {ENTITY_LABELS[e]}
          </button>
        ))}
      </div>

      <div className="page-header">
        <p style={{ color: "#605e5c", margin: 0 }}>Extra fields shown on every {ENTITY_LABELS[activeEntity].toLowerCase().slice(0, -1)} record.</p>
        <button className="primary" onClick={() => setShowNew(true)}>+ New Field</button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Label</th>
            <th>Type</th>
            <th>Required</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visibleFields.map(f => (
            <tr key={f.id}>
              <td>{f.label}</td>
              <td style={{ textTransform: "capitalize" }}>{f.fieldType}{f.fieldType === "select" && f.options ? ` (${f.options.join(", ")})` : ""}</td>
              <td>{f.required ? "Yes" : "No"}</td>
              <td><button className="link-button" onClick={() => setEditing(f)}>Edit</button></td>
            </tr>
          ))}
          {visibleFields.length === 0 && (
            <tr><td colSpan={4} style={{ textAlign: "center", color: "#605e5c", padding: 24 }}>No custom fields defined for {ENTITY_LABELS[activeEntity].toLowerCase()} yet.</td></tr>
          )}
        </tbody>
      </table>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3>New Field — {ENTITY_LABELS[activeEntity]}</h3>
            <form action={async (fd) => { await createField(fd); setShowNew(false); }}>
              <input type="hidden" name="entityType" value={activeEntity} />
              <FieldFormFields />
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button type="submit" className="primary">Create</button>
                <button type="button" className="secondary" onClick={() => setShowNew(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Field</h3>
            <form action={async (fd) => { await updateField(fd); setEditing(null); }}>
              <input type="hidden" name="id" value={editing.id} />
              <input type="hidden" name="fieldType" value={editing.fieldType} />
              <FieldFormFields field={editing} lockType />
              <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" className="primary">Save</button>
                  <button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button>
                </div>
                <form action={async (fd) => { await deleteField(fd); setEditing(null); }}>
                  <input type="hidden" name="id" value={editing.id} />
                  <button type="submit" className="danger" onClick={(e) => { if (!confirm(`Delete "${editing.label}"? Any values already stored in this field will no longer be shown.`)) e.preventDefault(); }}>Delete</button>
                </form>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldFormFields({ field, lockType }: { field?: IFieldDefinition; lockType?: boolean }) {
  const [fieldType, setFieldType] = useState<IFieldDefinition["fieldType"]>(field?.fieldType || "text");

  return (
    <>
      <div className="form-row">
        <label>Label</label>
        <input name="label" defaultValue={field?.label} required placeholder="e.g. Referral Source" />
      </div>
      <div className="form-row">
        <label>Type</label>
        {lockType ? (
          <input value={field!.fieldType} disabled style={{ textTransform: "capitalize", background: "#f3f2f1" }} />
        ) : (
          <select name="fieldType" value={fieldType} onChange={(e) => setFieldType(e.target.value as IFieldDefinition["fieldType"])}>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="currency">Currency</option>
            <option value="boolean">Yes/No</option>
            <option value="select">Dropdown (choose from a list)</option>
          </select>
        )}
        {lockType && <div className="form-hint">Type can't be changed after creation — delete and recreate if needed.</div>}
      </div>
      {fieldType === "select" && (
        <div className="form-row">
          <label>Options</label>
          <input name="options" defaultValue={field?.options?.join(", ")} placeholder="Comma-separated, e.g. Referral, Website, Cold Call" />
        </div>
      )}
      <div className="form-row">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
          <input type="checkbox" name="required" style={{ width: "auto" }} defaultChecked={field?.required} />
          Required
        </label>
      </div>
    </>
  );
}
