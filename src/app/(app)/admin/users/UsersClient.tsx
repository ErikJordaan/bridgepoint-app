"use client";

import { useState } from "react";
import { createUser, updateUser } from "./actions";

interface IUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export default function UsersClient({ users, roles }: { users: IUser[]; roles: string[] }) {
  const [editing, setEditing] = useState<IUser | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | undefined>();

  return (
    <div>
      <div className="page-header">
        <p style={{ color: "#605e5c", margin: 0 }}>Everyone who can sign into BridgePoint, and what role they have.</p>
        <button className="primary" onClick={() => { setError(undefined); setShowNew(true); }}>+ New User</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td><span className={u.active ? "badge badge-active" : "badge badge-inactive"}>{u.active ? "Active" : "Inactive"}</span></td>
              <td><button className="link-button" onClick={() => setEditing(u)}>Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3>New User</h3>
            <form action={async (fd) => {
              setError(undefined);
              try {
                await createUser(fd);
                setShowNew(false);
              } catch (err: any) {
                setError(err.message?.includes("already exist") ? "A user with that email already exists." : "Couldn't create the user. Please try again.");
              }
            }}>
              <div className="form-row">
                <label>Full Name</label>
                <input name="name" required />
              </div>
              <div className="form-row">
                <label>Email</label>
                <input name="email" type="email" required />
              </div>
              <div className="form-row">
                <label>Initial Password</label>
                <input name="password" type="password" required minLength={8} />
                <div className="form-hint">At least 8 characters. They can change this after signing in.</div>
              </div>
              <div className="form-row">
                <label>Role</label>
                <select name="role" required>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
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
            <h3>Edit User</h3>
            <form action={async (fd) => { await updateUser(fd); setEditing(null); }}>
              <input type="hidden" name="id" value={editing.id} />
              <div className="form-row">
                <label>Full Name</label>
                <input name="name" defaultValue={editing.name} required />
              </div>
              <div className="form-row">
                <label>Email</label>
                <input value={editing.email} disabled style={{ background: "#f3f2f1" }} />
                <div className="form-hint">Email can't be changed here.</div>
              </div>
              <div className="form-row">
                <label>Role</label>
                <select name="role" defaultValue={editing.role} required>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
                  <input type="checkbox" name="active" style={{ width: "auto" }} defaultChecked={editing.active} />
                  Active (unchecking this blocks them from signing in)
                </label>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" className="primary">Save</button>
                <button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
