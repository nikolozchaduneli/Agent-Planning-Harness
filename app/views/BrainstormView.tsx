"use client";

import { useAppStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import DictationMic from "@/app/components/DictationMic";
import useBrainstorm from "@/app/hooks/useBrainstorm";
import useVoiceRecording from "@/app/hooks/useVoiceRecording";

export default function BrainstormView() {
  const {
    brainstormMessages,
    activeDraft,
    clearBrainstorm,
    promoteDraftToProject,
    setView,
    projects,
  } = useAppStore(
    useShallow((state) => ({
      brainstormMessages: state.brainstormMessages,
      activeDraft: state.activeDraft,
      clearBrainstorm: state.clearBrainstorm,
      promoteDraftToProject: state.promoteDraftToProject,
      setView: state.setView,
      projects: state.projects,
    })),
  );
  const isFirstRun = projects.length === 0;

  const {
    brainstormInput,
    setBrainstormInput,
    isBrainstorming,
    handleBrainstorm,
    submitBrainstormMessage,
  } =
    useBrainstorm();
  const { startRecording, stopRecording, activeRecordingField } = useVoiceRecording();

  return (
    <section className="grid gap-8 md:grid-cols-[1fr_360px] h-[calc(100vh-118px)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col rounded-[32px] bg-white/80 p-6 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.4)] backdrop-blur-md border border-white/50 overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4 no-scrollbar scroll-smooth">
          {brainstormMessages.length === 0 && (
            <div className="text-center py-20 px-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center mb-6 shadow-lg shadow-[var(--accent)]/30">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  <path d="M5 3v4" />
                  <path d="M3 5h4" />
                  <path d="M21 17v4" />
                  <path d="M19 19h4" />
                </svg>
              </div>
              <h2 className="text-3xl font-semibold mb-3 tracking-tight">Project Drawing Board</h2>
              <p className="text-[var(--muted)] text-lg max-w-sm mx-auto leading-relaxed">
                Pitch me an idea. I&apos;ll help you architect the scope, milestones, and
                constraints before we build.
              </p>
              {isFirstRun && (
                <button
                  type="button"
                  onClick={() => {
                    setView("projects");
                    setTimeout(() => document.getElementById("project-name-input")?.focus(), 0);
                  }}
                  className="mt-6 rounded-full border border-[var(--border-medium)] bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink)] shadow-sm transition hover:-translate-y-0.5"
                >
                  Skip to manual setup
                </button>
              )}
            </div>
          )}

          {brainstormMessages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[85%] rounded-[24px] p-5 text-[15px] leading-relaxed shadow-sm transition-all ${
                msg.role === "user"
                  ? "self-end bg-[var(--accent)] text-white"
                  : "self-start bg-white border border-[rgba(15,23,42,0.06)] text-[var(--ink)]"
              }`}
            >
              {msg.content}
            </div>
          ))}

          {isBrainstorming && (
            <div className="self-start bg-white border border-[rgba(15,23,42,0.06)] text-[var(--muted)] rounded-[24px] p-5 text-sm animate-pulse flex items-center gap-3">
              <div className="flex gap-1">
                <div
                  className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
              Thinking...
            </div>
          )}
          <div id="anchor" />
        </div>

        <form id="brainstorm-form" onSubmit={handleBrainstorm} className="mt-6 flex flex-col gap-3">
          {!isBrainstorming &&
            brainstormMessages.length > 0 &&
            brainstormMessages[brainstormMessages.length - 1].role === "assistant" &&
            brainstormMessages[brainstormMessages.length - 1].options && (
              <div className="flex flex-wrap gap-2 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {brainstormMessages[brainstormMessages.length - 1].options?.map((opt, i) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => submitBrainstormMessage(opt)}
                    className={`group relative flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-2xl border transition-all shadow-sm ${
                      i === 0
                        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                        : "bg-white border-[var(--border-medium)] text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {i === 0 && (
                      <span className="flex items-center gap-1 bg-[var(--accent)] text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                        Suggest
                      </span>
                    )}
                    {opt}
                  </button>
                ))}
                <button
                  type="button"
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-medium rounded-2xl bg-white border border-[var(--border-medium)] text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)] transition-all italic"
                  onClick={() => document.getElementById("brainstorm-input")?.focus()}
                >
                  Keep riffing...
                </button>
              </div>
            )}

          <div className="relative group">
            <input
              id="brainstorm-input"
              value={brainstormInput}
              onChange={(e) => setBrainstormInput(e.target.value)}
              placeholder="Pitch the project you want to build..."
              className="w-full rounded-2xl border-transparent bg-[var(--panel)] pl-5 pr-12 py-4 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all group-hover:shadow-[0_0_0_1px_rgba(15,23,42,0.2)]"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <DictationMic
                isRecording={activeRecordingField === "brainstorm"}
                onClick={() => {
                  if (activeRecordingField === "brainstorm") stopRecording();
                  else
                    startRecording(
                      "brainstorm",
                      (text) => setBrainstormInput(text),
                      "Context: I am brainstorming a new project idea.",
                    );
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-2">
            <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] font-bold">
              Press enter to send
            </p>
            <button
              type="submit"
              disabled={!brainstormInput.trim() || isBrainstorming}
              className="rounded-full bg-[var(--accent)] px-6 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-lg shadow-[var(--accent)]/30 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              Send
            </button>
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-6 pr-6 overflow-y-auto no-scrollbar">
        <div className="rounded-[32px] bg-white/40 border border-white/60 p-6 backdrop-blur-md shadow-[0_10px_30px_-15px_rgba(15,23,42,0.1)]">
          <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--muted)] mb-6">
            Live Canvas
          </h3>
          {activeDraft ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold tracking-[0.1em] text-[var(--muted)]/60">
                  Project Name
                </label>
                <p className="text-lg font-semibold tracking-tight">
                  {activeDraft.name || "Drafting name..."}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold tracking-[0.1em] text-[var(--muted)]/60">
                  Core Goal
                </label>
                <p className="text-sm leading-relaxed text-[var(--ink)]/80 italic">
                  &ldquo;{activeDraft.goal || "Sketching the mission..."}&rdquo;
                </p>
              </div>

              {activeDraft.milestones.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-[10px] uppercase font-bold tracking-[0.1em] text-[var(--muted)]/60">
                    Proposed Milestones
                  </label>
                  <div className="flex flex-col gap-2">
                    {activeDraft.milestones.map((milestone, i) => (
                      <div
                        key={milestone}
                        className="flex gap-3 items-start text-xs bg-white/80 p-3 rounded-[16px] border border-white/60 shadow-sm transition-all hover:translate-x-1"
                      >
                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        {milestone}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeDraft.constraints.length > 0 && (
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase font-bold tracking-[0.1em] text-[var(--muted)]/60">
                    Constraints
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {activeDraft.constraints.map((constraint, i) => (
                      <span
                        key={`${constraint}-${i}`}
                        className="text-[10px] font-medium bg-slate-100 text-slate-500 py-1 px-2.5 rounded-full border border-slate-200"
                      >
                        {constraint}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={promoteDraftToProject}
                disabled={!activeDraft.isReady}
                className={`mt-6 w-full rounded-2xl py-4 text-xs font-bold uppercase tracking-[0.3em] shadow-xl transition-all group flex items-center justify-center gap-3 ${
                  activeDraft.isReady
                    ? "bg-[var(--ink)] text-white hover:scale-[1.02] active:scale-[0.98]"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                {activeDraft.isReady ? "Initialize Project" : "Awaiting Readiness..."}
                {activeDraft.isReady && (
                  <svg
                    className="transition-transform group-hover:translate-x-1"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>
            </div>
          ) : (
            <div className="text-center py-24 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-[var(--muted)]/30 flex items-center justify-center">
                <svg className="text-[var(--muted)]/30" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <p className="text-sm text-[var(--muted)] italic max-w-[180px]">
                Your project structure will materialize here as we chat.
              </p>
            </div>
          )}
        </div>

        {brainstormMessages.length > 0 && (
          <button
            onClick={clearBrainstorm}
            className="group flex items-center gap-2 text-[10px] uppercase font-bold tracking-[0.25em] text-[var(--muted)] hover:text-red-500 transition-colors self-center py-2"
          >
            Clear the board
            <svg
              className="transition-transform group-hover:rotate-90"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}
