import { useState } from "react";
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
  isRegenerating?: boolean;
  isNewlyGenerated?: boolean;
};

const styles = {
  card:
    "flex w-full flex-col gap-3 rounded-2xl border border-[var(--border-strong)] bg-white/95 px-3 py-4 shadow-[0_14px_28px_-18px_rgba(15,23,42,0.6)] min-w-0 overflow-hidden xl:flex-row xl:items-stretch xl:justify-between",
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
  isRegenerating = false,
  isNewlyGenerated = false,
}: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [draftDescription, setDraftDescription] = useState(task.description || "");

  const isLong = task.title.length > 80;
  const titleClass = `text-xl font-semibold text-[var(--ink)] max-w-full break-words ${isLong && !isExpanded ? "line-clamp-2 cursor-text hover:opacity-80" : ""}`;
  const detailsVisibilityClass = `${showDetails ? "block" : "hidden"} md:block`;
  const detailsVisibilityFlexClass = `${showDetails ? "flex" : "hidden"} md:flex`;

  const hasCornerPin = task.source === "ai" && onTogglePin;
  const animationClass = isRegenerating
    ? "task-regenerating"
    : isNewlyGenerated
      ? "task-generated-enter"
      : "";

  return (
    <div
      className={`${styles.card} relative ${animationClass}`}
      aria-busy={isRegenerating}
    >
      {isRegenerating && (
        <div className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/35 bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
          <span className="regen-dot" aria-hidden="true" />
          Regenerating
        </div>
      )}
      {mode === "plan" && onRemove && !isRegenerating && (
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
      <div className="min-w-0 flex-1 w-full xl:pr-6">
        <div className="relative flex items-center">
          {hasCornerPin && (
            <button
              type="button"
              onClick={() => onTogglePin?.(task.id)}
              disabled={isRegenerating}
              title={task.pinned ? "Unpin task" : "Pin task"}
              aria-label={task.pinned ? "Unpin task" : "Pin task"}
              className={`absolute left-0 top-1/2 -translate-y-[60%] flex h-7 w-7 items-center justify-center rounded-full border bg-white shadow-sm transition hover:-translate-y-[65%] ${
                task.pinned
                  ? "pin-indicator border-[var(--accent)] bg-white text-[var(--accent)] shadow-[0_6px_14px_-8px_rgba(249,115,22,0.9)]"
                  : "border-[var(--border-medium)] bg-white text-[var(--accent)]"
              } ${isRegenerating ? "opacity-50 cursor-not-allowed" : ""}`}
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
        <div>
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
              className="w-full rounded-lg border border-[var(--border-medium)] bg-white/90 px-2 py-1 text-xl font-semibold text-[var(--ink)] shadow-[0_0_0_1px_rgba(15,23,42,0.06)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] xl:max-w-[68ch]"
            />
          ) : (
            <h4
              className={`${titleClass} xl:max-w-[68ch]`}
              onClick={() => {
                if (isRegenerating) return;
                setDraftTitle(task.title);
                setIsEditingTitle(true);
                if (isLong) setIsExpanded(true);
              }}
              title="Click to edit"
            >
              {task.title}
            </h4>
          )}
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            disabled={isRegenerating}
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)] transition hover:opacity-80 md:hidden"
          >
            {showDetails ? "Hide details" : "Show details"}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={showDetails ? "rotate-180" : ""}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <div className={detailsVisibilityClass}>
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
                className="mt-2 w-full resize-none rounded-lg border border-[var(--border-medium)] bg-white/90 px-2 py-1 text-sm text-[var(--ink)] shadow-[0_0_0_1px_rgba(15,23,42,0.06)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] xl:max-w-[68ch]"
                placeholder="Add description"
              />
            ) : (
              <>
                {task.description ? (
                  <p
                    className="mt-2 max-w-full cursor-text break-words text-sm text-[var(--muted)] line-clamp-2 xl:max-w-[68ch]"
                    onClick={() => {
                      setDraftDescription(task.description || "");
                      setIsEditingDescription(true);
                      setShowDetails(true);
                    }}
                  >
                    {task.description}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftDescription(task.description || "");
                      setIsEditingDescription(true);
                      setShowDetails(true);
                    }}
                    className="mt-2 inline-flex items-center text-xs font-semibold text-[var(--accent)] transition hover:opacity-80"
                  >
                    + Add description
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {mode === "plan" && (
        <div className="flex w-full flex-col gap-2 xl:w-auto xl:flex-col xl:items-end xl:justify-between xl:self-stretch xl:gap-3 xl:pt-9">
          <div className={`${detailsVisibilityFlexClass} flex-col items-start gap-3 xl:items-end`}>
            <div className="flex flex-col items-start gap-1 md:flex-row md:items-center md:gap-2">
              <span className="text-[11px] font-medium text-[var(--muted)] md:mt-0">
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
                    disabled={isRegenerating}
                    className={styles.estimateInput}
                  />
                <span className="text-[11px] font-medium text-[var(--muted)]">min</span>
              </div>
            </div>
          </div>
          <div className={`${detailsVisibilityFlexClass} items-center justify-end gap-2 pt-2`}>
            <button
              onClick={() => onFocus?.(task.id)}
              disabled={isRegenerating}
              className="whitespace-nowrap rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5"
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
              disabled={isRegenerating}
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
        <div className={`${detailsVisibilityFlexClass} flex-wrap items-center gap-2`}>
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

