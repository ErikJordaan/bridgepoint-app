"use client";

import { useState } from "react";
import CustomFieldInputs from "@/components/CustomFieldInputs";
import { updateDeal, logAction, deleteDeal, reopenDeal } from "./actions";
import styles from "./deals.module.css";

type Stage = {
  id: number;
  name: string;
  probability: number;
  isClosedWon: boolean;
  isClosedLost: boolean;
};

type Deal = {
  id: number;
  reference: string;
  title: string;
  description: string | null;
  companyId: number;
  contactId: number | null;
  ownerId: string;
  stageId: number;
  value: string | null;
  probability: number;
  weightedValue: string | null;
  nextAction: string | null;
  nextActionDate: Date | null;
  isOpen: boolean;
  closeDate: Date | null;
  finalValue: string | null;
  lostReason: string | null;
  customFields: unknown;
};

type Company = { id: number; name: string };
type Contact = { id: number; companyId: number; name: string };
type FieldDef = import("@/lib/custom-fields").IFieldDefinition;

function formatDate(d: Date | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-ZA");
}

export default function DealDetailPanel({
  deal,
  stages,
  companies,
  allContacts,
  customFieldDefs,
  canEdit,
  canClose,
  canDelete,
  onClose,
  onDealChange,
  onDealDeleted,
}: {
  deal: Deal;
  stages: Stage[];
  companies: Company[];
  contacts: Contact[];
  allContacts: Contact[];
  customFieldDefs: FieldDef[];
  canEdit: boolean;
  canClose: boolean;
  canDelete: boolean;
  onClose: () => void;
  onDealChange: (deal: Deal) => void;
  onDealDeleted: (id: number) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(deal.companyId);

  const stage = stages.find((s) => s.id === deal.stageId);
  const companyContacts = allContacts.filter((c) => c.companyId === selectedCompanyId);

  async function handleSave(formData: FormData) {
    setError(null);
    setSaved(false);
    try {
      await updateDeal(deal.id, formData);
      const value = Number(formData.get("value") || 0);
      const weightedValue = stage ? (value * stage.probability) / 100 : deal.weightedValue;
      onDealChange({
        ...deal,
        title: String(formData.get("title") || deal.title),
        description: String(formData.get("description") || "").trim() || null,
        value: String(value),
        weightedValue: String(weightedValue),
        companyId: Number(formData.get("companyId")) || deal.companyId,
        contactId: formData.get("contactId") ? Number(formData.get("contactId")) : null,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save deal.");
    }
  }

  async function handleLogAction(formData: FormData) {
    setError(null);
    try {
      await logAction(deal.id, formData);
      setSaved(true);
      const nextAction = String(formData.get("nextAction") || "").trim();
      if (nextAction) {
        const nextActionDateRaw = formData.get("nextActionDate");
        onDealChange({
          ...deal,
          nextAction,
          nextActionDate: nextActionDateRaw ? new Date(String(nextActionDateRaw)) : null,
        });
      }
      (document.getElementById("action-form") as HTMLFormElement | null)?.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not log the follow-up.");
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete deal "${deal.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await deleteDeal(deal.id);
      onDealDeleted(deal.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete deal.");
    }
  }

  async function handleReopen() {
    setError(null);
    try {
      await reopenDeal(deal.id);
      onDealChange({ ...deal, isOpen: true, finalValue: null, lostReason: null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reopen deal.");
    }
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={`${styles.modal} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}>
          ×
        </button>
        <h2 className={styles.modalTitle}>{deal.title}</h2>
        <div className={styles.modalSubtitle}>
          {deal.reference} · Stage: {stage?.name || "Unknown"}
          {!deal.isOpen && (
            <span style={{ marginLeft: 8 }}>
              {deal.lostReason ? `· Lost: ${deal.lostReason}` : "· Closed Won"}
            </span>
          )}
          {deal.nextAction && (
            <div className={styles.nextActionNote}>
              Next action: {deal.nextAction}
              {deal.nextActionDate ? ` (${formatDate(deal.nextActionDate)})` : ""}
            </div>
          )}
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}
        {saved && <div className={styles.savedBanner}>✓ Saved</div>}

        <form action={handleSave}>
          <div className={styles.field}>
            <label htmlFor="d-title">Deal title</label>
            <input id="d-title" name="title" defaultValue={deal.title} required disabled={!canEdit} />
          </div>
          <div className={styles.field}>
            <label htmlFor="d-value">Value (R)</label>
            <input id="d-value" name="value" type="number" step="any" defaultValue={deal.value ?? 0} disabled={!canEdit} />
          </div>
          <div className={styles.field}>
            <label htmlFor="d-companyId">Company *</label>
            <select
              id="d-companyId"
              name="companyId"
              defaultValue={deal.companyId}
              required
              disabled={!canEdit}
              onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="d-contactId">Contact</label>
            <select id="d-contactId" name="contactId" defaultValue={deal.contactId ?? ""} disabled={!canEdit}>
              <option value="">-- None --</option>
              {companyContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="d-description">Description</label>
            <textarea id="d-description" name="description" rows={2} defaultValue={deal.description ?? ""} disabled={!canEdit} />
          </div>

          <CustomFieldInputs fields={customFieldDefs} values={deal.customFields as Record<string, unknown>} />

          {canEdit && (
            <button type="submit" className={`${styles.btn} ${styles.btnFull}`}>
              Save Changes
            </button>
          )}
        </form>

        <hr className={styles.divider} />

        <h3>Log a follow-up</h3>
        <form action={handleLogAction} id="action-form">
          <div className={styles.field}>
            <label htmlFor="method">Method</label>
            <select id="method" name="method" defaultValue="Telephonic">
              <option value="None">None</option>
              <option value="Telephonic">Telephonic</option>
              <option value="Email">Email</option>
              <option value="In Person">In Person</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" rows={3} />
          </div>
          <div className={styles.field}>
            <label htmlFor="nextAction">Next action</label>
            <input id="nextAction" name="nextAction" />
          </div>
          <div className={styles.field}>
            <label htmlFor="nextActionDate">Next action date</label>
            <input id="nextActionDate" name="nextActionDate" type="date" />
          </div>
          <button type="submit" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnFull}`}>
            Log follow-up
          </button>
        </form>

        <div className={styles.actionButtons}>
          {canClose && !deal.isOpen && (
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleReopen}>
              Reopen deal
            </button>
          )}
          {canDelete && (
            <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleDelete}>
              Delete deal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
