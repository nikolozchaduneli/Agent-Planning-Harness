import DictationMic from "@/app/components/DictationMic";
import useVoiceRecording from "@/app/hooks/useVoiceRecording";
import { blockNonNumericKey, blockNonNumericPaste } from "@/lib/forms";

type ManualTaskFormProps = {
  manualTitle: string;
  setManualTitle: (value: string) => void;
  manualEstimate: number;
  setManualEstimate: (value: number) => void;
  onAdd: () => void;
  selectedMilestoneTitle?: string;
};

export default function ManualTaskForm({
  manualTitle,
  setManualTitle,
  manualEstimate,
  setManualEstimate,
  onAdd,
  selectedMilestoneTitle,
}: ManualTaskFormProps) {
  const { startRecording, stopRecording, activeRecordingField } = useVoiceRecording();

  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--border-medium)] bg-white/90 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 flex items-center">
          <input
            value={manualTitle}
            onChange={(event) => setManualTitle(event.target.value)}
            placeholder="Add a manual task"
            className="w-full rounded-xl border border-transparent bg-[var(--panel)] px-3 py-2 pr-10 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <div className="absolute right-1">
            <DictationMic
              isRecording={activeRecordingField === "manualTitle"}
              onClick={() => {
                if (activeRecordingField === "manualTitle") stopRecording();
                else {
                  const msContext = selectedMilestoneTitle
                    ? ` Milestone: ${selectedMilestoneTitle}`
                    : "";
                  startRecording(
                    "manualTitle",
                    (text) => setManualTitle(text),
                    `Context: I am dictating a short, actionable task title.${msContext}`,
                  );
                }
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-[var(--muted)]">
            Time
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={5}
              max={240}
              step={5}
              placeholder="Minutes"
              inputMode="numeric"
              pattern="[0-9]*"
              value={manualEstimate || ""}
              onFocus={(e) => e.target.select()}
              onKeyDown={blockNonNumericKey}
              onPaste={blockNonNumericPaste}
              onChange={(event) =>
                setManualEstimate(event.target.value === "" ? 0 : Number(event.target.value))
              }
              className="w-24 rounded-xl border border-[var(--border-medium)] bg-white/90 px-3 py-2 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
            <span className="text-[11px] font-medium text-[var(--muted)]">min</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={onAdd}
            className="rounded-full border border-[var(--border-medium)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink)] shadow transition hover:-translate-y-0.5"
          >
            Add
          </button>
          <span className="text-[10px] text-[var(--muted)] max-w-[140px] truncate">
            Scope: {selectedMilestoneTitle || "Whole Project"}
          </span>
        </div>
      </div>
    </div>
  );
}
