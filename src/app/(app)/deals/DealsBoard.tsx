"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { createDeal, moveDealStage, closeDeal } from "./actions";
import DealDetailPanel from "./DealDetailPanel";
import styles from "./deals.module.css";

type Stage = {
  id: number;
  name: string;
  probability: number;
  sortOrder: number;
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
type UserOpt = { id: string; name: string };
type FieldDef = import("@/lib/custom-fields").IFieldDefinition;

function formatCurrency(v: string | number | null) {
  const n = Number(v || 0);
  return "R " + n.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function DealCard({ deal, companyName, onOpen }: { deal: Deal; companyName?: string; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 10 : ("auto" as const) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={styles.card}
      onClick={() => {
        if (!isDragging) onOpen();
      }}
    >
      <div className={styles.cardTitle}>{deal.title}</div>
      <div className={styles.cardValue}>{formatCurrency(deal.value)}</div>
      <div className={styles.cardMeta}>
        {deal.reference}
        {companyName ? ` · ${companyName}` : ""}
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  deals,
  companyById,
  onOpenDeal,
}: {
  stage: Stage;
  deals: Deal[];
  companyById: Map<number, string>;
  onOpenDeal: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = deals.reduce((sum, d) => sum + Number(d.value || 0), 0);

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <span>{stage.name}</span>
        <span className={styles.columnCount}>{deals.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={isOver ? `${styles.columnBody} ${styles.columnBodyOver}` : styles.columnBody}
      >
        {deals.map((d) => (
          <DealCard
            key={d.id}
            deal={d}
            companyName={companyById.get(d.companyId)}
            onOpen={() => onOpenDeal(d.id)}
          />
        ))}
      </div>
      <div className={styles.columnFooter}>{formatCurrency(total)} total</div>
    </div>
  );
}

export default function DealsBoard({
  currentUser,
  canCreate,
  canCreateForOthers,
  canEdit,
  canClose,
  canDelete,
  stages,
  deals: initialDeals,
  companies,
  contacts,
  users,
  customFieldDefs,
}: {
  currentUser: { id: string; name: string };
  canCreate: boolean;
  canCreateForOthers: boolean;
  canEdit: boolean;
  canClose: boolean;
  canDelete: boolean;
  stages: Stage[];
  deals: Deal[];
  companies: Company[];
  contacts: Contact[];
  users: UserOpt[];
  customFieldDefs: FieldDef[];
}) {
  const [deals, setDeals] = useState(initialDeals);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newDealCompanyId, setNewDealCompanyId] = useState<number | undefined>(companies[0]?.id);
  const [openDealId, setOpenDealId] = useState<number | null>(null);
  const [pendingClose, setPendingClose] = useState<{ dealId: number; stageId: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c.name])), [companies]);
  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);

  function dealsForStage(stageId: number) {
    return deals.filter((d) => d.stageId === stageId);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const dealId = Number(active.id);
    const targetStageId = Number(over.id);
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stageId === targetStageId) return;

    if (!canEdit) {
      setError("You don't have permission to move deals.");
      return;
    }

    const targetStage = stageById.get(targetStageId);
    if (!targetStage) return;

    if (targetStage.isClosedWon || targetStage.isClosedLost) {
      if (!canClose) {
        setError("You don't have permission to close deals.");
        return;
      }
      setPendingClose({ dealId, stageId: targetStageId });
      return;
    }

    const prevDeals = deals;
    setDeals((cur) =>
      cur.map((d) =>
        d.id === dealId
          ? { ...d, stageId: targetStageId, weightedValue: String((Number(d.value || 0) * targetStage.probability) / 100), probability: targetStage.probability }
          : d
      )
    );

    startTransition(async () => {
      try {
        await moveDealStage(dealId, targetStageId);
      } catch (e) {
        setDeals(prevDeals);
        setError(e instanceof Error ? e.message : "Could not move deal.");
      }
    });
  }

  async function handleCreate(formData: FormData) {
    setError(null);
    try {
      const deal = await createDeal(formData);
      setDeals((cur) => [...cur, deal as unknown as Deal]);
      setShowNewModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create deal.");
    }
  }

  async function handleConfirmClose(finalValue: number | undefined, lostReason: string | undefined) {
    if (!pendingClose) return;
    const { dealId, stageId } = pendingClose;
    setError(null);
    try {
      await closeDeal(dealId, stageId, { finalValue, lostReason });
      const stage = stageById.get(stageId)!;
      setDeals((cur) =>
        cur.map((d) =>
          d.id === dealId
            ? {
                ...d,
                stageId,
                isOpen: false,
                finalValue: String(finalValue ?? 0),
                lostReason: lostReason ?? null,
                probability: stage.probability,
              }
            : d
        )
      );
      setPendingClose(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not close deal.");
    }
  }

  const openDeal = deals.find((d) => d.id === openDealId) || null;
  const pendingStage = pendingClose ? stageById.get(pendingClose.stageId) : null;
  const newDealContacts = contacts.filter((c) => c.companyId === newDealCompanyId);

  return (
    <div className={styles.page}>
      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button onClick={() => setError(null)} className={styles.dismissBtn}>
            ×
          </button>
        </div>
      )}

      {canCreate && (
        <div className={styles.topBar}>
          <button className={styles.btn} onClick={() => setShowNewModal(true)} disabled={companies.length === 0}>
            + New Deal
          </button>
          {companies.length === 0 && (
            <span className={styles.hint}>Add a company first under Companies & Contacts.</span>
          )}
        </div>
      )}

      <DndContext id="deals-board" sensors={sensors} onDragEnd={handleDragEnd}>
        <div className={styles.board}>
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={dealsForStage(stage.id)}
              companyById={companyById}
              onOpenDeal={(id) => setOpenDealId(id)}
            />
          ))}
        </div>
      </DndContext>

      {showNewModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowNewModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowNewModal(false)}>
              ×
            </button>
            <h2 className={styles.modalTitle}>New Deal</h2>
            <form action={handleCreate}>
              <div className={styles.field}>
                <label htmlFor="title">Deal title</label>
                <input id="title" name="title" required />
              </div>
              <div className={styles.field}>
                <label htmlFor="stageId">Stage</label>
                <select id="stageId" name="stageId" defaultValue={stages.find((s) => !s.isClosedWon && !s.isClosedLost)?.id}>
                  {stages
                    .filter((s) => !s.isClosedWon && !s.isClosedLost)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="value">Value (R)</label>
                <input id="value" name="value" type="number" step="any" defaultValue={0} />
              </div>
              <div className={styles.field}>
                <label htmlFor="companyId">Company *</label>
                <select
                  id="companyId"
                  name="companyId"
                  required
                  defaultValue={newDealCompanyId}
                  onChange={(e) => setNewDealCompanyId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="contactId">Contact</label>
                <select id="contactId" name="contactId" defaultValue="">
                  <option value="">-- None --</option>
                  {newDealContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="description">Description</label>
                <textarea id="description" name="description" rows={2} />
              </div>
              {canCreateForOthers && (
                <div className={styles.field}>
                  <label htmlFor="ownerId">Owner</label>
                  <select id="ownerId" name="ownerId" defaultValue={currentUser.id}>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button type="submit" className={`${styles.btn} ${styles.btnFull}`}>
                Create Deal
              </button>
            </form>
          </div>
        </div>
      )}

      {openDeal && (
        <DealDetailPanel
          deal={openDeal}
          stages={stages}
          companies={companies}
          contacts={contacts.filter((c) => c.companyId === openDeal.companyId)}
          allContacts={contacts}
          customFieldDefs={customFieldDefs}
          canEdit={canEdit}
          canClose={canClose}
          canDelete={canDelete}
          onClose={() => setOpenDealId(null)}
          onDealChange={(updated) => setDeals((cur) => cur.map((d) => (d.id === updated.id ? updated : d)))}
          onDealDeleted={(id) => {
            setDeals((cur) => cur.filter((d) => d.id !== id));
            setOpenDealId(null);
          }}
        />
      )}

      {pendingClose && pendingStage && (
        <div className={styles.modalBackdrop} onClick={() => setPendingClose(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setPendingClose(null)}>
              ×
            </button>
            <h2 className={styles.modalTitle}>Move to &quot;{pendingStage.name}&quot;</h2>
            <CloseForm
              stage={pendingStage}
              defaultValue={Number(deals.find((d) => d.id === pendingClose.dealId)?.value || 0)}
              onConfirm={handleConfirmClose}
              onCancel={() => setPendingClose(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CloseForm({
  stage,
  defaultValue,
  onConfirm,
  onCancel,
}: {
  stage: Stage;
  defaultValue: number;
  onConfirm: (finalValue: number | undefined, lostReason: string | undefined) => void;
  onCancel: () => void;
}) {
  const [finalValue, setFinalValue] = useState(defaultValue);
  const [lostReason, setLostReason] = useState("");

  return (
    <div>
      {stage.isClosedWon ? (
        <div className={styles.field}>
          <label htmlFor="finalValue">Final deal value (R)</label>
          <input
            id="finalValue"
            type="number"
            step="any"
            value={finalValue}
            onChange={(e) => setFinalValue(Number(e.target.value))}
          />
        </div>
      ) : (
        <div className={styles.field}>
          <label htmlFor="lostReason">Reason lost</label>
          <input
            id="lostReason"
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            required
          />
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onCancel} type="button">
          Cancel
        </button>
        <button
          className={styles.btn}
          type="button"
          onClick={() => onConfirm(stage.isClosedWon ? finalValue : undefined, stage.isClosedLost ? lostReason : undefined)}
          disabled={stage.isClosedLost && !lostReason.trim()}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
