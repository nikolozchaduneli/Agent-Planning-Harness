import { useState } from "react";
import type { Milestone } from "@/lib/types";

type MilestoneListEditableProps = {
  milestones: Milestone[];
  onMove: (id: string, direction: "up" | "down") => void;
  onUpdate: (
    id: string,
    data: { title: string; description?: string },
  ) => void;
  onDelete: (id: string) => void;
  autoEditMilestoneId?: string | null;
  highlightMilestoneId?: string | null;
};

const styles = {
  row:
    "rounded-2xl border border-[var(--border-medium)] bg-white/90 p-3 shadow-sm focus-within:ring-2 focus-within:ring-[var(--ring)] transition-all",
  iconButton:
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--ink)]",
};

export default function MilestoneListEditable({
  milestones,
  onMove,
  onUpdate,
  onDelete,
  autoEditMilestoneId,
  highlightMilestoneId,
}: MilestoneListEditableProps) {
  const initialAutoEditMilestone = autoEditMilestoneId
    ? milestones.find((milestone) => milestone.id === autoEditMilestoneId)
    : null;
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(
    initialAutoEditMilestone?.id ?? null,
  );
  const [editingMilestoneTitle, setEditingMilestoneTitle] = useState(
    initialAutoEditMilestone?.title ?? "",
  );
  const [editingMilestoneDescription, setEditingMilestoneDescription] = useState(
    initialAutoEditMilestone?.description ?? "",
  );

  if (milestones.length === 0) {
    return <p className="text-sm italic text-[var(--muted)]">No milestones created yet.</p>;
  }

  return (
    <div className="grid gap-3">
      {milestones.map((milestone, index, array) => (
        <div
          key={milestone.id}
          className={`${styles.row} ${highlightMilestoneId === milestone.id ? "ring-2 ring-[var(--ring)]" : ""}`}
        >
          <div className="flex items-start gap-2">
            <div className="flex flex-col gap-0.5 pl-1 pr-1 pt-1 opacity-40 transition-opacity hover:opacity-100">
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
              <div className="grid min-w-0 flex-1 gap-2">
                <input
                  className="rounded-xl border border-[var(--border-medium)] bg-white px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  value={editingMilestoneTitle}
                  onChange={(e) => setEditingMilestoneTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      onUpdate(milestone.id, {
                        title: editingMilestoneTitle,
                        description: editingMilestoneDescription,
                      });
                      setEditingMilestoneId(null);
                    }
                    if (e.key === "Escape") {
                      setEditingMilestoneId(null);
                    }
                  }}
                  autoFocus
                />
                <textarea
                  rows={2}
                  value={editingMilestoneDescription}
                  onChange={(e) => setEditingMilestoneDescription(e.target.value)}
                  placeholder="Concise milestone description"
                  className="rounded-xl border border-[var(--border-medium)] bg-white px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      onUpdate(milestone.id, {
                        title: editingMilestoneTitle,
                        description: editingMilestoneDescription,
                      });
                      setEditingMilestoneId(null);
                    }}
                    className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white transition hover:-translate-y-0.5"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingMilestoneId(null)}
                    className="rounded-full bg-[rgba(31,45,43,0.08)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:-translate-y-0.5"
                  >
                    Cancel
                  </button>
                  <span className="text-[11px] text-[var(--muted)]">Tip: Ctrl/Cmd + Enter to save</span>
                </div>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                <div className="min-w-0 px-2 py-1">
                  <p className="text-[15px] font-medium text-[var(--ink)]">{milestone.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                    {milestone.description?.trim() || "No description yet."}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingMilestoneId(milestone.id);
                      setEditingMilestoneTitle(milestone.title);
                      setEditingMilestoneDescription(milestone.description ?? "");
                    }}
                    className={styles.iconButton}
                    title="Edit milestone"
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
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
