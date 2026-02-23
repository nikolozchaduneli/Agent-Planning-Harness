import type { MouseEventHandler } from "react";

type DictationMicProps = {
  isRecording: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
};

export default function DictationMic({ isRecording, onClick }: DictationMicProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`flex items-center justify-center rounded-full p-2 transition opacity-60 hover:opacity-100 ${
        isRecording
          ? "bg-red-100 text-red-600 animate-pulse opacity-100"
          : "bg-transparent text-[var(--ink)]"
      }`}
      title={isRecording ? "Stop dictation" : "Start dictation"}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    </button>
  );
}
