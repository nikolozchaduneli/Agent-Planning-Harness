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
    "group relative flex w-full flex-col rounded-[20px] bg-[var(--panel)] border border-[rgba(31,45,43,0.06)] px-5 py-4 shadow-sm min-w-0 transition-all hover:shadow-md shadow-[0_2px_8px_rgb(0,0,0,0.02)]",
  badge:
    "inline-flex rounded-full bg-[var(--panel)] px-2 py-1 text-xs font-medium text-[var(--muted)] mb-2",
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
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [draftDescription, setDraftDescription] = useState(task.description || "");

  const hasPin = task.source === "ai" && onTogglePin;
  const animationClass = isRegenerating
    ? "task-regenerating"
    : isNewlyGenerated
      ? "task-generated-enter"
      : "";
  const pinnedCardClass = task.pinned
    ? "border-[var(--accent)]/45 ring-1 ring-[var(--accent)]/20 shadow-[0_10px_24px_-18px_rgba(31,45,43,0.5)]"
    : "";

  const formatEstimate = (minutes: number) => {
    if (!minutes) return "0m";
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${minutes}m`;
  };

  return (
    <div
      className={`${styles.card} ${animationClass} ${pinnedCardClass}`}
      aria-busy={isRegenerating}
    >
      {task.pinned && (
        <span className="pointer-events-none absolute inset-y-3 left-2 w-1 rounded-full bg-[var(--accent)]/70" />
      )}
      {isRegenerating && (
        <div className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/35 bg-white/95 px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
          <span className="regen-dot" aria-hidden="true" />
          Regenerating
        </div>
      )}

      {/* === DEFAULT ROW: checkbox + title + time label + hover actions === */}
      <div className="flex items-start gap-3">
        {/* Done checkbox - always visible */}
        <button
          type="button"
          onClick={() =>
            onStatusChange(task.id, task.status === "done" ? "todo" : "done")
          }
          disabled={isRegenerating}
          aria-label={task.status === "done" ? "Mark as todo" : "Mark done"}
          title={task.status === "done" ? "Mark as todo" : "Mark done"}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${task.status === "done"
            ? "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]"
            : "border-[var(--border-medium)] bg-white text-transparent hover:border-[var(--border-strong)] hover:text-[var(--muted)]"
            }`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12l5 5L19 7" />
          </svg>
        </button>

        {/* Title + inline time */}
        <div className="min-w-0 flex-1">
          {task.pinned && (
            <span className="mb-1 inline-flex items-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
              Pinned
            </span>
          )}
          {isEditingTitle ? (
            <input
              autoFocus
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
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-[15px] font-semibold tracking-tight text-[var(--ink)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ring)] xl:max-w-[68ch]"
            />
          ) : (
            <div
              className="flex items-baseline gap-2 cursor-text"
              onClick={() => {
                if (isRegenerating) return;
                setDraftTitle(task.title);
                setIsEditingTitle(true);
                setIsExpanded(true);
              }}
              title="Click to edit"
            >
              <h4
                className={`text-[15px] font-semibold tracking-tight text-[var(--ink)] max-w-full break-words xl:max-w-[60ch] ${task.status === "done" ? "line-through opacity-60" : ""} ${!isExpanded ? "line-clamp-1" : ""} transition-colors hover:text-[var(--muted)]`}
              >
                {task.title}
              </h4>
              <span className="shrink-0 text-[12px] tabular-nums text-[var(--muted)]">
                - {formatEstimate(task.estimateMinutes)}
              </span>
            </div>
          )}
        </div>

        {/* Hover actions: pin, remove, expand, focus */}
        {mode === "plan" && !isRegenerating && (
          <div
            className={`flex shrink-0 items-center gap-1 transition-opacity ${task.pinned
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
              }`}
          >
            {hasPin && (
              <button
                type="button"
                onClick={() => onTogglePin?.(task.id)}
                title={task.pinned ? "Unpin task" : "Pin task"}
                aria-label={task.pinned ? "Unpin task" : "Pin task"}
                className={`flex h-7 w-7 items-center justify-center rounded-full border transition hover:scale-105 ${task.pinned
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--border-medium)] bg-white text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30"
                  }`}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={task.pinned ? "2.5" : "2"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={task.pinned ? "" : "rotate-[35deg]"}
                >
                  <path d="M12 2a4 4 0 0 1 4 4v4.5l2 2V14H6v-1.5l2-2V6a4 4 0 0 1 4-4Z" />
                  <path d="M12 14v7" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => onFocus?.(task.id)}
              title="Send to Focus"
              aria-label="Send to Focus"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-medium)] bg-white text-[var(--muted)] transition hover:text-[var(--ink)] hover:border-[var(--border-strong)]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3h7v7" />
                <path d="M10 14L21 3" />
                <path d="M5 7v12h12" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              title={isExpanded ? "Collapse" : "Expand"}
              aria-label={isExpanded ? "Collapse" : "Expand"}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-medium)] bg-white text-[var(--muted)] transition hover:text-[var(--ink)] hover:border-[var(--border-strong)]"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition ${isExpanded ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(task.id)}
                title="Remove task"
                aria-label="Remove task"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-medium)] bg-white text-[var(--muted)] transition hover:text-red-500 hover:border-red-200"
              >
                <svg
                  width="12"
                  height="12"
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
          </div>
        )}
      </div>

      {/* === EXPANDED SECTION: description + editable estimate === */}
      {
        isExpanded && mode === "plan" && (
          <div className="mt-3 flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-3">
            {/* Description */}
            <div>
              {isEditingDescription ? (
                <textarea
                  autoFocus
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
                  className="w-full resize-none rounded-lg border border-transparent bg-[var(--panel)] px-3 py-2 text-[13px] text-[var(--muted)] transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ring)] xl:max-w-[68ch]"
                  placeholder="Add a description..."
                />
              ) : (
                <>
                  {task.description ? (
                    <p
                      className="max-w-full cursor-text break-words text-[13px] text-[var(--muted)] xl:max-w-[68ch]"
                      onClick={() => {
                        setDraftDescription(task.description || "");
                        setIsEditingDescription(true);
                      }}
                    >
                      {task.description}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftDescription("");
                        setIsEditingDescription(true);
                      }}
                      className="text-xs font-medium text-[var(--muted)]/80 transition hover:text-[var(--accent)]"
                    >
                      + Add description
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Editable estimate */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[var(--muted)]">Estimate:</span>
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
                className="w-20 rounded-lg border border-[var(--border-medium)] bg-white px-2 py-1 text-sm font-medium text-[var(--ink)] text-center transition focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                aria-label="Estimate (minutes)"
              />
              <span className="text-xs text-[var(--muted)]/80">min</span>
            </div>
          </div>
        )
      }

      {/* === FOCUS MODE (unchanged) === */}
      {
        mode === "focus" && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`${tw.ghostBtn} text-sm`}>Estimate: {task.estimateMinutes}m</span>
            <span className={`${tw.ghostBtn} text-sm`}>Status: {task.status}</span>
            <button
              onClick={() => onStatusChange(task.id, "doing")}
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold tracking-wide text-white shadow transition hover:-translate-y-0.5"
            >
              Start task
            </button>
            <button
              onClick={() => onStatusChange(task.id, "done")}
              className="rounded-full bg-[var(--success)] px-4 py-2 text-sm font-semibold tracking-wide text-white shadow transition hover:-translate-y-0.5"
            >
              Mark done
            </button>
          </div>
        )
      }
    </div >
  );
}
