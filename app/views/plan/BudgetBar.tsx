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

const styles = {
  wrapper: "rounded-2xl bg-[var(--panel)] px-4 py-2 text-sm",
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
    <div className={styles.wrapper}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2">
            Planned:{" "}
            <span
              className={`inline-block font-semibold tabular-nums transition-all duration-200 ${
                plannedTick
                  ? "text-[var(--accent)] -translate-y-0.5"
                  : isOverBudget
                    ? "text-red-600"
                    : "text-[var(--ink)]"
              }`}
            >
              {formatMinutes(totalPlanned)}
            </span>
          </span>
          <span className="text-[var(--muted)]">|</span>
          <span>
            Budget:{" "}
            <span className={isOverBudget ? "text-red-600" : "font-semibold"}>
              {formatMinutes(budget || 0)}
            </span>{" "}
            <span className="text-xs text-[var(--muted)]">
              ({hasBudgetOverride ? "override" : "default"})
            </span>
          </span>
          {!showBudgetOverride && (
            <button
              type="button"
              onClick={() => setShowBudgetOverride(true)}
              className="text-xs font-semibold text-[var(--accent)] transition hover:opacity-80"
            >
              Adjust today&apos;s time
            </button>
          )}
        </div>
        <div className="h-2 w-full rounded-full bg-white/80 shadow-inner">
          {budgetPercent > 0 && (
            <div
              className={`h-2 rounded-full origin-left transition-all duration-200 ${
                isOverBudget ? "bg-red-500" : "bg-[var(--accent)]"
              } ${budgetPulse ? "scale-[1.02] shadow-sm ring-2 ring-[var(--accent)]/30" : "scale-100"}`}
              style={{ width: `${budgetPercent}%` }}
            />
          )}
        </div>
      </div>
      {showBudgetOverride && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-medium text-[var(--muted)]">
            Time for today
          </span>
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
            className="w-28 rounded-xl border border-[var(--border-medium)] bg-white px-3 py-1.5 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <span className="text-xs uppercase tracking-[0.1em] text-[var(--muted)]">minutes</span>
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
              className="text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--ink)]"
            >
              Reset
            </button>
          )}
        </div>
      )}
      {isOverBudget && budget > 0 && (
        <p className="mt-1 text-xs text-red-500">
          Over budget by {formatMinutes(totalPlanned - budget)} - remove a task or adjust
          estimates.
        </p>
      )}
    </div>
  );
}
