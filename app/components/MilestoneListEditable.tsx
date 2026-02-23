import { useState } from "react";
import type { Milestone } from "@/lib/types";

type MilestoneListEditableProps = {
  milestones: Milestone[];
  onMove: (id: string, direction: "up" | "down") => void;
  onUpdate: (id: string, title: string) => void;
  onDelete: (id: string) => void;
};

const styles = {
  row:
    "flex items-center gap-2 rounded-2xl border border-[var(--border-medium)] bg-white/90 p-2 pr-4 shadow-sm focus-within:ring-2 focus-within:ring-[var(--ring)] transition-all",
  iconButton:
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--ink)]",
};

export default function MilestoneListEditable({
  milestones,
  onMove,
  onUpdate,
  onDelete,
}: MilestoneListEditableProps) {
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editingMilestoneTitle, setEditingMilestoneTitle] = useState("");

  if (milestones.length === 0) {
    return <p className="text-sm italic text-[var(--muted)]">No milestones created yet.</p>;
  }

  return (
    <div className="grid gap-3">
      {milestones.map((milestone, index, array) => (
        <div key={milestone.id} className={styles.row}>
          <div className="flex flex-col gap-0.5 pl-2 pr-1 opacity-40 hover:opacity-100 transition-opacity">
            <button
              onClick={() => onMove(milestone.id, "up")}
              disabled={index === 0}
              className="flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-30 disabled:hover:text-[var(--muted)]"
              title="Move up"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m18 15-6-6-6 6" />
              </svg>
            </button>
            <button
              onClick={() => onMove(milestone.id, "down")}
              disabled={index === array.length - 1}
              className="flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-30 disabled:hover:text-[var(--muted)]"
              title="Move down"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>

          {editingMilestoneId === milestone.id ? (
            <>
              <input
                className="flex-1 rounded-xl border border-transparent bg-transparent px-3 py-2 text-[15px] focus:outline-none"
                value={editingMilestoneTitle}
                onChange={(e) => setEditingMilestoneTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onUpdate(milestone.id, editingMilestoneTitle);
                    setEditingMilestoneId(null);
                  }
                  if (e.key === "Escape") {
                    setEditingMilestoneId(null);
                  }
                }}
                autoFocus
              />
              <button
                onClick={() => {
                  onUpdate(milestone.id, editingMilestoneTitle);
                  setEditingMilestoneId(null);
                }}
                className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white transition hover:-translate-y-0.5"
              >
                Save
              </button>
              <button
                onClick={() => setEditingMilestoneId(null)}
                className="rounded-full bg-[rgba(15,23,42,0.08)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:-translate-y-0.5"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <div className="flex-1 px-3 py-2 text-[15px] cursor-default">{milestone.title}</div>
              <button
                onClick={() => {
                  setEditingMilestoneId(milestone.id);
                  setEditingMilestoneTitle(milestone.title);
                }}
                className={styles.iconButton}
                title="Edit milestone name"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(milestone.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-red-50 hover:text-red-600"
                title="Delete milestone"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
