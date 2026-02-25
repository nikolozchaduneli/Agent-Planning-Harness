"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";

export default function useBrainstorm() {
  const [brainstormInput, setBrainstormInput] = useState("");
  const [isBrainstorming, setIsBrainstorming] = useState(false);

  const { brainstormMessages, addBrainstormMessage, updateActiveDraft, activeDraft, ui } =
    useAppStore(
      useShallow((state) => ({
        brainstormMessages: state.brainstormMessages,
        addBrainstormMessage: state.addBrainstormMessage,
        updateActiveDraft: state.updateActiveDraft,
        activeDraft: state.activeDraft,
        ui: state.ui,
      })),
    );

  useEffect(() => {
    if (ui.activeView === "brainstorm" && brainstormMessages.length > 0) {
      document.getElementById("anchor")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [brainstormMessages, ui.activeView]);

  const submitBrainstormMessage = async (rawContent: string) => {
    if (isBrainstorming) return;
    const content = rawContent.trim();
    if (!content) return;

    setBrainstormInput("");
    addBrainstormMessage("user", content);
    setIsBrainstorming(true);

    try {
      const response = await fetch("/api/ai/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...brainstormMessages, { role: "user", content }],
          currentDraft: activeDraft,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Brainstorm failed");
      }
      addBrainstormMessage("assistant", data.message, data.options);
      if (data.updatedDraft) {
        updateActiveDraft(data.updatedDraft);
      }
    } catch (err) {
      console.error("Brainstorm error", err);
      addBrainstormMessage(
        "assistant",
        "I hit a snag in my thinking process. Could you say that again?",
      );
    } finally {
      setIsBrainstorming(false);
    }
  };

  const handleBrainstorm = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await submitBrainstormMessage(brainstormInput);
  };

  return {
    brainstormInput,
    setBrainstormInput,
    isBrainstorming,
    handleBrainstorm,
    submitBrainstormMessage,
  };
}
