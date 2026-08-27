"use client";

import { useState } from "react";
import { createRole, renameRole, deleteRole, saveRolePermissions } from "./actions";
import { groupedPermissions } from "@/lib/permissions";

interface IRole {
  id: number;
  name: string;
  description: string | null;
  permissionKeys: string[];
}

export default function RolesClient({ roles }: { roles: IRole[] }) {
  const [selectedId, setSelectedId] = useState<number | undefined>(roles[0]?.id);
  const [showNew, setShowNew] = useState(false);
  const [editingRole, setEditingRole] = useState(false);
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set(roles[0]?.permissionKeys || []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const selectedRole = roles.find(r => r.id === selectedId);
  const groups = groupedPermissions();

  const selectRole = (role: IRole) => {
    setSelectedId(role.id);
    setCheckedKeys(new Set(role.permissionKeys));
    setError(undefined);
  };

  const toggle = (key: string) => {
    const next = new Set(checkedKeys);
    if (next.has(key)) next.delete(key); else next.add(key);
    setCheckedKeys(next);
  };

  const save = async () => {
    if (!selectedRole) return;
    setSaving(true);
    await saveRolePermissions(selectedRole.id, Array.from(checkedKeys));
    setSaving(false);
  };

  const onDelete = async () => {
    if (!selectedRole) return;
    if (!confirm(`Delete the "${selectedRole.name}" role?`)) return;
    setError(undefined);
    try {
      const fd = new FormData();
      fd.set("id", String(selectedRole.id));
      await deleteRole(fd);
      setSelectedId(roles.find(r => r.id !== selectedRole.id)?.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: "flex", gap: 24 }}>
      <div style={{ width: 220, flexShrink: 0 }}>
        <div className="page-header" style={{ marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: "#605e5c" }}>ROLES</span>
          <button className="link-button" onClick={() => setShowNew(true)}>+ New</button>
        </div>
        {roles.map(r => (
          <div
            key={r.id}
            onClick={() => selectRole(r)}
            style={{
              padding: "8px 12px", borderRadius: 4, cursor: "pointer", marginBottom: 2,
              background: r.id === selectedId ? "#e8ecf7" : "transparent",
              color: r.id === selectedId ? "var(--brand-blue)" : "#1a1a1a",
              fontWeight: r.id === selectedId ? 600 : 400, fontSize: 14
            }}
          >
            {r.name}
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }}>
        {error && <div className="error-banner">{error}</div>}
        {selectedRole ? (
          <>
            <div className="page-header">
              <div>
                <h3 style={{ margin: 0 }}>{selectedRole.name}</h3>
                {selectedRole.description && <p style={{ color: "#605e5c", margin: "4px 0 0 0", fontSize: 13 }}>{selectedRole.description}</p>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="secondary" onClick={() => setEditingRole(true)}>Rename</button>
                <button className="danger" onClick={onDelete}>Delete</button>
              </div>
            </div>

            <div className="card">
              {groups.map(g => (
                <div className="permission-group" key={g.group}>
                  <h4>{g.group}</h4>
                  {g.items.map(p => (
                    <label className="permission-item" key={p.key}>
                      <input type="checkbox" checked={checkedKeys.has(p.key)} onChange={() => toggle(p.key)} />
                      {p.label}
                    </label>
                  ))}
                </div>
              ))}
              <button className="primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Permissions"}</button>
            </div>
          </>
        ) : (
          <p style={{ color: "#605e5c" }}>No roles yet — create one to get started.</p>
        )}
      </div>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3>New Role</h3>
            <form action={async (fd) => { await createRole(fd); setShowNew(false); }}>
              <div className="form-row">
                <label>Name</label>
                <input name="name" required placeholder="e.g. Warehouse" />
              </div>
              <div className="form-row">
                <label>Description (optional)</label>
                <input name="description" placeholder="What this role is for" />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" className="primary">Create</button>
                <button type="button" className="secondary" onClick={() => setShowNew(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingRole && selectedRole && (
        <div className="modal-overlay" onClick={() => setEditingRole(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3>Rename Role</h3>
            <form action={async (fd) => { await renameRole(fd); setEditingRole(false); }}>
              <input type="hidden" name="id" value={selectedRole.id} />
              <div className="form-row">
                <label>Name</label>
                <input name="name" defaultValue={selectedRole.name} required />
              </div>
              <div className="form-row">
                <label>Description (optional)</label>
                <input name="description" defaultValue={selectedRole.description || ""} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" className="primary">Save</button>
                <button type="button" className="secondary" onClick={() => setEditingRole(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
