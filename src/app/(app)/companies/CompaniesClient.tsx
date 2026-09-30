"use client";

import { useState } from "react";
import { createCompany, updateCompany, createContact, updateContact } from "./actions";
import CustomFieldInputs from "@/components/CustomFieldInputs";
import { IFieldDefinition } from "@/lib/custom-fields";

interface ICompany {
  id: number;
  name: string;
  phone: string | null;
  active: boolean;
  customFields: Record<string, unknown> | null;
}

interface IContact {
  id: number;
  name: string;
  email: string | null;
  mobile: string | null;
  companyId: number;
  active: boolean;
  customFields: Record<string, unknown> | null;
}

export default function CompaniesClient({
  companies,
  contacts,
  companyFields,
  contactFields,
  canEdit
}: {
  companies: ICompany[];
  contacts: IContact[];
  companyFields: IFieldDefinition[];
  contactFields: IFieldDefinition[];
  canEdit: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ICompany | null>(null);
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [editingContact, setEditingContact] = useState<IContact | null>(null);
  const [error, setError] = useState<string | undefined>();

  const visibleCompanies = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const companyContacts = selected ? contacts.filter(c => c.companyId === selected.id) : [];

  return (
    <div>
      <div className="page-header">
        <input
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        {canEdit && <button className="primary" onClick={() => { setError(undefined); setShowNewCompany(true); }}>+ New Company</button>}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visibleCompanies.map(c => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.phone || "-"}</td>
              <td><span className={c.active ? "badge badge-active" : "badge badge-inactive"}>{c.active ? "Active" : "Inactive"}</span></td>
              <td><button className="link-button" onClick={() => { setError(undefined); setSelected(c); }}>{canEdit ? "Manage" : "View"}</button></td>
            </tr>
          ))}
          {visibleCompanies.length === 0 && (
            <tr><td colSpan={4} style={{ textAlign: "center", color: "#605e5c", padding: 24 }}>No companies found.</td></tr>
          )}
        </tbody>
      </table>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-panel" style={{ width: 640 }} onClick={(e) => e.stopPropagation()}>
            <h3>{selected.name}</h3>
            {error && <div className="error-banner">{error}</div>}

            <div style={{ borderBottom: "1px solid var(--brand-grey)", paddingBottom: 16, marginBottom: 16 }}>
              <form action={async (fd) => {
                setError(undefined);
                try {
                  await updateCompany(fd);
                } catch (err: any) {
                  setError(err.message || "Couldn't save the company.");
                }
              }}>
                <input type="hidden" name="id" value={selected.id} />
                <div className="form-row">
                  <label>Company Name</label>
                  <input name="name" defaultValue={selected.name} required disabled={!canEdit} />
                </div>
                <div className="form-row">
                  <label>Phone</label>
                  <input name="phone" defaultValue={selected.phone || ""} disabled={!canEdit} />
                </div>
                <CustomFieldInputs fields={companyFields} values={selected.customFields || {}} />
                {canEdit && (
                  <div className="form-row">
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
                      <input type="checkbox" name="active" style={{ width: "auto" }} defaultChecked={selected.active} />
                      Active
                    </label>
                  </div>
                )}
                {canEdit && <button type="submit" className="primary">Save Company</button>}
              </form>
            </div>

            <h4 style={{ marginBottom: 8 }}>Contacts</h4>
            <table className="data-table" style={{ marginBottom: 12 }}>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Mobile</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {companyContacts.map(c => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.email || "-"}</td>
                    <td>{c.mobile || "-"}</td>
                    <td><span className={c.active ? "badge badge-active" : "badge badge-inactive"}>{c.active ? "Active" : "Inactive"}</span></td>
                    <td>{canEdit && <button className="link-button" onClick={() => setEditingContact(c)}>Edit</button>}</td>
                  </tr>
                ))}
                {companyContacts.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "#605e5c", padding: 16 }}>No contacts yet.</td></tr>
                )}
              </tbody>
            </table>

            {canEdit && <button className="secondary" onClick={() => setShowNewContact(true)}>+ Add Contact</button>}
          </div>
        </div>
      )}

      {showNewCompany && (
        <div className="modal-overlay" onClick={() => setShowNewCompany(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3>New Company</h3>
            {error && <div className="error-banner">{error}</div>}
            <form action={async (fd) => {
              setError(undefined);
              try {
                await createCompany(fd);
                setShowNewCompany(false);
              } catch (err: any) {
                setError(err.message || "Couldn't create the company.");
              }
            }}>
              <div className="form-row">
                <label>Company Name</label>
                <input name="name" required />
              </div>
              <div className="form-row">
                <label>Phone</label>
                <input name="phone" />
              </div>
              <CustomFieldInputs fields={companyFields} />
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button type="submit" className="primary">Create</button>
                <button type="button" className="secondary" onClick={() => setShowNewCompany(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNewContact && selected && (
        <div className="modal-overlay" onClick={() => setShowNewContact(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3>New Contact — {selected.name}</h3>
            {error && <div className="error-banner">{error}</div>}
            <form action={async (fd) => {
              setError(undefined);
              try {
                await createContact(fd);
                setShowNewContact(false);
              } catch (err: any) {
                setError(err.message || "Couldn't create the contact.");
              }
            }}>
              <input type="hidden" name="companyId" value={selected.id} />
              <div className="form-row">
                <label>Name</label>
                <input name="name" required />
              </div>
              <div className="form-row">
                <label>Email</label>
                <input name="email" type="email" />
              </div>
              <div className="form-row">
                <label>Mobile</label>
                <input name="mobile" />
              </div>
              <CustomFieldInputs fields={contactFields} />
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button type="submit" className="primary">Create</button>
                <button type="button" className="secondary" onClick={() => setShowNewContact(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingContact && (
        <div className="modal-overlay" onClick={() => setEditingContact(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Contact</h3>
            {error && <div className="error-banner">{error}</div>}
            <form action={async (fd) => {
              setError(undefined);
              try {
                await updateContact(fd);
                setEditingContact(null);
              } catch (err: any) {
                setError(err.message || "Couldn't save the contact.");
              }
            }}>
              <input type="hidden" name="id" value={editingContact.id} />
              <div className="form-row">
                <label>Name</label>
                <input name="name" defaultValue={editingContact.name} required />
              </div>
              <div className="form-row">
                <label>Email</label>
                <input name="email" type="email" defaultValue={editingContact.email || ""} />
              </div>
              <div className="form-row">
                <label>Mobile</label>
                <input name="mobile" defaultValue={editingContact.mobile || ""} />
              </div>
              <CustomFieldInputs fields={contactFields} values={editingContact.customFields || {}} />
              <div className="form-row">
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
                  <input type="checkbox" name="active" style={{ width: "auto" }} defaultChecked={editingContact.active} />
                  Active
                </label>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" className="primary">Save</button>
                <button type="button" className="secondary" onClick={() => setEditingContact(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
