import { useEffect, useState } from "react";
import type { Task, TaskStatus } from "@/lib/types";
import { tw } from "@/lib/constants";
import { blockNonNumericKey, blockNonNumericPaste } from "@/lib/forms";

type TaskCardProps = {
  task: Task;
  mode: "plan" | "focus";
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEstimateChange?: (id: string, minutes: number) => void;
  onTogglePin?: (id: string) => void;
  onFocus?: (id: string) => void;
  onUpdateDetails?: (id: string, data: Partial<Pick<Task, "title" | "description">>) => void;
  onRemove?: (id: string) => void;
};

const styles = {
  card:
    "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-strong)] bg-white/95 p-3 shadow-[0_14px_28px_-18px_rgba(15,23,42,0.6)] min-w-0 overflow-hidden",
  badge:
    "inline-flex rounded-full bg-[var(--panel)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)] mb-2",
  estimateInput:
    "w-20 rounded-xl border border-[var(--border-medium)] bg-white/90 px-2 py-1 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]",
  pillButton:
    "rounded-full border border-[var(--border-medium)] bg-white px-3 py-2 text-xs uppercase tracking-[0.2em] text-[var(--ink)] shadow transition hover:-translate-y-0.5",
};

export default function TaskCard({
  task,
  mode,
  onStatusChange,
  onEstimateChange,
  onTogglePin,
  onFocus,
  onUpdateDetails,
  onRemove,
}: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [draftDescription, setDraftDescription] = useState(task.description || "");

  const isLong = task.title.length > 80;
  const titleClass = `text-xl font-semibold text-[var(--ink)] max-w-full break-all ${isLong && !isExpanded ? "line-clamp-2 cursor-text hover:opacity-80" : ""}`;

  useEffect(() => {
    if (!isEditingTitle) setDraftTitle(task.title);
  }, [task.title, isEditingTitle]);

  useEffect(() => {
    if (!isEditingDescription) setDraftDescription(task.description || "");
  }, [task.description, isEditingDescription]);

  const hasCornerPin = task.source === "ai" && onTogglePin;

  return (
    <div className={`${styles.card} relative`}>
      {mode === "plan" && onRemove && (
        <button
          type="button"
          onClick={() => onRemove(task.id)}
          className="absolute right-3 top-3 rounded-full p-1 text-[var(--muted)] transition hover:text-[var(--ink)]"
          title="Remove task"
          aria-label="Remove task"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="relative flex items-center">
          {hasCornerPin && (
            <button
              type="button"
              onClick={() => onTogglePin?.(task.id)}
              title={task.pinned ? "Unpin task" : "Pin task"}
              aria-label={task.pinned ? "Unpin task" : "Pin task"}
              className={`absolute left-0 top-1/2 -translate-y-[60%] flex h-7 w-7 items-center justify-center rounded-full border bg-white text-[var(--accent)] shadow-sm transition hover:-translate-y-[65%] ${
                task.pinned
                  ? "pin-indicator border-[var(--accent)] bg-[var(--accent)] text-white shadow-[0_6px_14px_-8px_rgba(249,115,22,0.9)]"
                  : "border-[var(--border-medium)] bg-white text-[var(--accent)]"
              }`}
            >
              {task.pinned ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 2a4 4 0 0 1 4 4v4.5l2 2V14H6v-1.5l2-2V6a4 4 0 0 1 4-4Z" />
                  <path d="M12 14v7" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="rotate-[35deg]"
                >
                  <path d="M12 2a4 4 0 0 1 4 4v4.5l2 2V14H6v-1.5l2-2V6a4 4 0 0 1 4-4Z" />
                  <path d="M12 14v7" />
                </svg>
              )}
            </button>
          )}
          <span className={`${styles.badge} ${hasCornerPin ? "ml-10" : ""}`}>
            {task.source === "ai" ? "AI task" : "Manual task"}
          </span>
        </div>
        <div className="mt-3">
        {isEditingTitle ? (
          <input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={() => {
              setIsEditingTitle(false);
              if (draftTitle.trim() && draftTitle !== task.title) {
                onUpdateDetails?.(task.id, { title: draftTitle.trim() });
              } else {
                setDraftTitle(task.title);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            className="w-full rounded-lg border border-[var(--border-medium)] bg-white/90 px-2 py-1 text-xl font-semibold text-[var(--ink)] shadow-[0_0_0_1px_rgba(15,23,42,0.06)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        ) : (
          <h4
            className={titleClass}
            onClick={() => {
              setIsEditingTitle(true);
              if (isLong) setIsExpanded(true);
            }}
            title="Click to edit"
          >
            {task.title}
          </h4>
        )}
        {isEditingDescription ? (
          <textarea
            value={draftDescription}
            onChange={(event) => setDraftDescription(event.target.value)}
            onBlur={() => {
              setIsEditingDescription(false);
              const next = draftDescription.trim();
              if (next !== (task.description || "")) {
                onUpdateDetails?.(task.id, { description: next || undefined });
              } else {
                setDraftDescription(task.description || "");
              }
            }}
            rows={3}
            className="mt-2 w-full resize-none rounded-lg border border-[var(--border-medium)] bg-white/90 px-2 py-1 text-sm text-[var(--ink)] shadow-[0_0_0_1px_rgba(15,23,42,0.06)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            placeholder="Add description"
          />
        ) : (
          <p
            className={`mt-2 text-sm text-[var(--muted)] max-w-full break-all ${task.description ? "line-clamp-2" : ""} cursor-text`}
            onClick={() => {
              setIsEditingDescription(true);
            }}
          >
            {task.description || "Add description"}
          </p>
        )}
        </div>
      </div>

      {mode === "plan" && (
        <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-[var(--muted)]">
                Time
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={240}
                  step={5}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={task.estimateMinutes || ""}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={blockNonNumericKey}
                  onPaste={blockNonNumericPaste}
                  onChange={(event) =>
                    onEstimateChange?.(
                      task.id,
                      event.target.value === "" ? 0 : Number(event.target.value),
                    )
                  }
                  className={styles.estimateInput}
                />
                <span className="text-[11px] font-medium text-[var(--muted)]">min</span>
              </div>
            </div>
            {task.source === "ai" && <div className="h-9" />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onFocus?.(task.id)}
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5"
            >
              <span className="inline-flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 3h7v7" />
                  <path d="M10 14L21 3" />
                  <path d="M5 7v12h12" />
                </svg>
                Send to Focus
              </span>
            </button>
            <button
              onClick={() =>
                onStatusChange(task.id, task.status === "done" ? "todo" : "done")
              }
              aria-label={task.status === "done" ? "Mark as todo" : "Mark done"}
              title={task.status === "done" ? "Mark as todo" : "Mark done"}
              className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition hover:-translate-y-0.5 ${
                task.status === "done"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-[var(--border-medium)] bg-white text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12l2.5 2.5L16 9" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {mode === "focus" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${tw.ghostBtn} text-sm`}>Estimate: {task.estimateMinutes}m</span>
          <span className={`${tw.ghostBtn} text-sm`}>Status: {task.status}</span>
          <button
            onClick={() => onStatusChange(task.id, "doing")}
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow transition hover:-translate-y-0.5"
          >
            Start task
          </button>
          <button
            onClick={() => onStatusChange(task.id, "done")}
            className="rounded-full bg-emerald-500 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white shadow transition hover:-translate-y-0.5"
          >
            Mark done
          </button>
        </div>
      )}
    </div>
  );
}
