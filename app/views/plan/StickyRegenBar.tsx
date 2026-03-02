import { createPortal } from "react-dom";
import type { Milestone } from "@/lib/types";

type StickyRegenBarProps = {
  show: boolean;
  projectMilestones: Milestone[];
  selectedMilestoneId: string;
  setSelectedMilestoneId: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
};

export default function StickyRegenBar({
  show,
  projectMilestones,
  selectedMilestoneId,
  setSelectedMilestoneId,
  onGenerate,
  isGenerating,
}: StickyRegenBarProps) {
  if (!show || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[70] w-[min(960px,calc(100vw-2rem))] -translate-x-1/2">
      <div className="pointer-events-auto flex h-14 items-center justify-between gap-3 rounded-2xl border border-[var(--border-medium)] bg-white/95 px-4 shadow-[0_-6px_18px_-12px_rgba(31,45,43,0.5)] backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[11px] font-semibold text-[var(--muted)]">Milestone</span>
          <select
            className="min-w-[160px] max-w-[260px] truncate rounded-full border border-transparent bg-[var(--panel)] px-3 py-2 text-xs shadow-[0_0_0_1px_rgba(31,45,43,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            value={selectedMilestoneId}
            onChange={(e) => setSelectedMilestoneId(e.target.value)}
          >
            <option value="">Whole Project</option>
            {projectMilestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.title}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onGenerate}
          className="flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60"
          disabled={isGenerating}
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
            className="overflow-visible"
            aria-hidden="true"
          >
            <path d="m5 5 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
            <path d="m19 5 1 3 3 1-3 1-1 3-1-3-3-1 3-1z" />
          </svg>
          {isGenerating ? "Generating..." : "Generate tasks"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
