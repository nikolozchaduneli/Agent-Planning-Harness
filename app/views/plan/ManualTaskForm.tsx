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
      <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
        <div className="relative flex w-full min-w-0 flex-1 items-center">
          <input
            value={manualTitle}
            onChange={(event) => setManualTitle(event.target.value)}
            placeholder="Add a manual task"
            className="h-10 w-full rounded-xl border border-transparent bg-[var(--panel)] px-3 pr-10 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
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
        <div className="flex w-full items-center gap-2 md:w-auto md:justify-self-start">
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
              className="h-10 w-24 rounded-xl border border-[var(--border-medium)] bg-white/90 px-3 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
            <span className="text-[11px] font-medium text-[var(--muted)]">min</span>
          </div>
        </div>
        <div className="flex w-full justify-start md:w-auto md:justify-self-end">
          <button
            onClick={onAdd}
            className="h-10 rounded-full border border-[var(--border-medium)] bg-white px-5 text-xs font-semibold text-[var(--ink)] shadow transition hover:-translate-y-0.5"
          >
            Add
          </button>
        </div>
      </div>
      <p className="text-[11px] text-[var(--muted)]">
        Scope:{" "}
        <span className="font-medium text-[var(--ink)]">
          {selectedMilestoneTitle || "Whole Project"}
        </span>
      </p>
    </div>
  );
}
