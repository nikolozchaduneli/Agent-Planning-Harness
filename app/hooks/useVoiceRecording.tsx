"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useAppStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";

export type StartRecording = (
  fieldId: string,
  onTranscript: (text: string) => void,
  promptContext?: string,
) => Promise<void>;

type VoiceRecordingContextValue = {
  startRecording: StartRecording;
  stopRecording: () => void;
  activeRecordingField: string | null;
  voiceLoading: boolean;
  voiceError: string | null;
};

const VoiceRecordingContext = createContext<VoiceRecordingContextValue | null>(null);

function useVoiceRecordingState(): VoiceRecordingContextValue {
  const [activeRecordingField, setActiveRecordingField] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeRecordingCallback = useRef<((transcript: string) => void) | null>(null);

  const { projects, ui, setLastTranscript, setLastVoicePrompt } = useAppStore(
    useShallow((state) => ({
      projects: state.projects,
      ui: state.ui,
      setLastTranscript: state.setLastTranscript,
      setLastVoicePrompt: state.setLastVoicePrompt,
    })),
  );
  const selectedProject = projects.find((project) => project.id === ui.selectedProjectId);

  const buildTranscriptionPrompt = useCallback(() => {
    if (!selectedProject) {
      return "";
    }
    const name = selectedProject.name.trim();
    const goal = selectedProject.goal.trim();
    const goalSnippet = goal.length > 400 ? `${goal.slice(0, 400)}...` : goal;
    return `Context: The project is "${name}". It is spelled exactly as shown.
Goal: ${goalSnippet || "none"}.
Prefer exact capitalization for product names and acronyms.`;
  }, [selectedProject]);

  const uploadAudio = useCallback(
    async (blob: Blob, promptContext?: string) => {
      const form = new FormData();
      form.append("model", "gpt-4o-mini-transcribe");
      form.append("file", blob, "recording.webm");
      const prompt = promptContext || buildTranscriptionPrompt();
      if (prompt) {
        form.append("prompt", prompt);
        setLastVoicePrompt(prompt);
      }
      const response = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Voice transcription failed.");
      }
      const transcript = data?.transcript ?? "No transcript";
      setLastTranscript(transcript);
      return transcript;
    },
    [buildTranscriptionPrompt, setLastTranscript, setLastVoicePrompt],
  );

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const startRecording: StartRecording = useCallback(
    async (fieldId, onTranscript, promptContext) => {
      if (activeRecordingField) stopRecording();
      setVoiceError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setVoiceError("Microphone not supported in this browser.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        setActiveRecordingField(fieldId);
        activeRecordingCallback.current = onTranscript;

        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          audioChunksRef.current = [];
          stream.getTracks().forEach((track) => track.stop());
          setVoiceLoading(true);
          try {
            const transcript = await uploadAudio(audioBlob, promptContext);
            if (activeRecordingCallback.current) {
              activeRecordingCallback.current(transcript);
            }
          } catch (error) {
            setVoiceError((error as Error).message);
          } finally {
            setVoiceLoading(false);
            setActiveRecordingField(null);
            activeRecordingCallback.current = null;
          }
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
      } catch {
        setVoiceError("Microphone permission denied.");
      }
    },
    [activeRecordingField, stopRecording, uploadAudio],
  );

  return {
    startRecording,
    stopRecording,
    activeRecordingField,
    voiceLoading,
    voiceError,
  };
}

export function VoiceRecordingProvider({ children }: { children: ReactNode }) {
  const value = useVoiceRecordingState();
  return (
    <VoiceRecordingContext.Provider value={value}>
      {children}
    </VoiceRecordingContext.Provider>
  );
}

export default function useVoiceRecording() {
  const context = useContext(VoiceRecordingContext);
  if (!context) {
    throw new Error("useVoiceRecording must be used within VoiceRecordingProvider");
  }
  return context;
}
