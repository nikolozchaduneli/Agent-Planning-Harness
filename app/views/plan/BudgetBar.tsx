import { formatMinutes } from "@/lib/constants";
import { blockNonNumericKey, blockNonNumericPaste } from "@/lib/forms";

type BudgetBarProps = {
  totalPlanned: number;
  budget: number;
  isOverBudget: boolean;
  budgetPercent: number;
  plannedTick: boolean;
  budgetPulse: boolean;
  hasBudgetOverride: boolean;
  showBudgetOverride: boolean;
  setShowBudgetOverride: (value: boolean) => void;
  budgetOverrideDraft: string;
  setBudgetOverrideDraft: (value: string) => void;
  onSaveOverride: (value: number) => void;
  onClearOverride: () => void;
};

export default function BudgetBar({
  totalPlanned,
  budget,
  isOverBudget,
  budgetPercent,
  plannedTick,
  budgetPulse,
  hasBudgetOverride,
  showBudgetOverride,
  setShowBudgetOverride,
  budgetOverrideDraft,
  setBudgetOverrideDraft,
  onSaveOverride,
  onClearOverride,
}: BudgetBarProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
      {/* Compact time display */}
      <div className="flex items-center gap-2">
        <span className="flex items-baseline gap-1 text-sm tabular-nums">
          <span
            className={`font-semibold transition-all duration-200 ${plannedTick
                ? "text-[var(--accent)] -translate-y-0.5"
                : isOverBudget
                  ? "text-[var(--warning)]"
                  : "text-[var(--ink)]"
              }`}
          >
            {formatMinutes(totalPlanned)}
          </span>
          <span className="text-[var(--muted)] font-normal">/</span>
          <span className={`font-medium ${isOverBudget ? "text-[var(--warning)]" : "text-[var(--muted)]"}`}>
            {formatMinutes(budget || 0)}
          </span>
        </span>
        {/* Clock icon to toggle time override */}
        <button
          type="button"
          onClick={() => setShowBudgetOverride(!showBudgetOverride)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--ink)]"
          title="Adjust today's time"
          aria-label="Adjust today's time"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>
      </div>

      {/* Thin progress bar */}
      <div className="h-1.5 w-full rounded-full bg-[rgba(31,45,43,0.08)]">
        {budgetPercent > 0 && (
          <div
            className={`h-1.5 rounded-full origin-left transition-all duration-300 ease-out ${isOverBudget ? "bg-[var(--warning)]" : "bg-[var(--accent)]"
              } ${budgetPulse ? "scale-x-[1.02] ring-1 ring-[var(--accent)]/20" : ""}`}
            style={{ width: `${Math.min(budgetPercent, 100)}%` }}
          />
        )}
      </div>

      {/* Over-budget hint */}
      {isOverBudget && budget > 0 && (
        <p className="text-[11px] text-[var(--warning)]/90">
          {formatMinutes(totalPlanned - budget)} over — remove a task or adjust
        </p>
      )}

      {/* Override input (hidden by default) */}
      {showBudgetOverride && (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={30}
            max={720}
            step={5}
            placeholder="Minutes"
            inputMode="numeric"
            pattern="[0-9]*"
            value={budgetOverrideDraft}
            onFocus={(e) => e.target.select()}
            onKeyDown={blockNonNumericKey}
            onPaste={blockNonNumericPaste}
            onChange={(event) => setBudgetOverrideDraft(event.target.value)}
            className="w-24 rounded-lg border border-[var(--border-medium)] bg-[var(--panel)] px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <span className="text-[10px] text-[var(--muted)]">min</span>
          <button
            type="button"
            onClick={() => {
              if (budgetOverrideDraft.trim() === "") {
                onClearOverride();
                setShowBudgetOverride(false);
                return;
              }
              const parsed = Number(budgetOverrideDraft);
              if (!Number.isNaN(parsed) && parsed > 0) {
                onSaveOverride(parsed);
                setShowBudgetOverride(false);
              }
            }}
            className="text-xs font-semibold text-[var(--accent)] transition hover:opacity-80"
          >
            Save
          </button>
          {hasBudgetOverride && (
            <button
              type="button"
              onClick={() => {
                onClearOverride();
                setShowBudgetOverride(false);
              }}
              className="text-xs text-[var(--muted)] transition hover:text-[var(--ink)]"
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
