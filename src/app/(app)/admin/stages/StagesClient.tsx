"use client";

import { useState } from "react";
import { createStage, updateStage, deleteStage } from "./actions";

interface IDealStage {
  id: number;
  name: string;
  probability: number;
  sortOrder: number;
  isClosedWon: boolean;
  isClosedLost: boolean;
}

export default function StagesClient({ stages }: { stages: IDealStage[] }) {
  const [editing, setEditing] = useState<IDealStage | null>(null);
  const [showNew, setShowNew] = useState(false);

  return (
    <div>
      <div className="page-header">
        <p style={{ color: "#605e5c", margin: 0 }}>The stages a deal moves through, and the win probability each one represents.</p>
        <button className="primary" onClick={() => setShowNew(true)}>+ New Stage</button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Name</th>
            <th>Probability</th>
            <th>Outcome</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {stages.map(s => (
            <tr key={s.id}>
              <td>{s.sortOrder}</td>
              <td>{s.name}</td>
              <td>{s.probability}%</td>
              <td>
                {s.isClosedWon && <span className="badge badge-active">Closed Won</span>}
                {s.isClosedLost && <span className="badge" style={{ background: "#fbe1e2", color: "var(--brand-red)" }}>Closed Lost</span>}
                {!s.isClosedWon && !s.isClosedLost && <span className="badge badge-inactive">Open</span>}
              </td>
              <td>
                <button className="link-button" onClick={() => setEditing(s)}>Edit</button>
              </td>
            </tr>
          ))}
          {stages.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign: "center", color: "#605e5c", padding: 24 }}>No deal stages yet.</td></tr>
          )}
        </tbody>
      </table>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3>New Deal Stage</h3>
            <form action={async (fd) => { await createStage(fd); setShowNew(false); }}>
              <StageFormFields />
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
            <h3>Edit Deal Stage</h3>
            <form action={async (fd) => { await updateStage(fd); setEditing(null); }}>
              <input type="hidden" name="id" value={editing.id} />
              <StageFormFields stage={editing} showSortOrder />
              <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" className="primary">Save</button>
                  <button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button>
                </div>
                <button
                  type="button"
                  className="danger"
                  onClick={async () => {
                    if (!confirm(`Delete "${editing.name}"? This can't be undone.`)) return;
                    await deleteStage(editing.id);
                    setEditing(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StageFormFields({ stage, showSortOrder }: { stage?: IDealStage; showSortOrder?: boolean }) {
  return (
    <>
      <div className="form-row">
        <label>Name</label>
        <input name="name" defaultValue={stage?.name} required />
      </div>
      <div className="form-row">
        <label>Probability (%)</label>
        <input name="probability" type="number" min={0} max={100} defaultValue={stage?.probability ?? 10} required />
      </div>
      {showSortOrder && (
        <div className="form-row">
          <label>Order</label>
          <input name="sortOrder" type="number" defaultValue={stage?.sortOrder} required />
        </div>
      )}
      <div className="form-row">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
          <input type="checkbox" name="isClosedWon" style={{ width: "auto" }} defaultChecked={stage?.isClosedWon} />
          This stage means the deal is closed WON
        </label>
      </div>
      <div className="form-row">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
          <input type="checkbox" name="isClosedLost" style={{ width: "auto" }} defaultChecked={stage?.isClosedLost} />
          This stage means the deal is closed LOST
        </label>
      </div>
    </>
  );
}
