"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export default function useStickyRegenBar(
  milestoneDropdownRef: RefObject<HTMLDivElement | null>,
  activeView: string,
  hasPlanTasks: boolean,
  aiPromptActive: boolean,
  regenMessageActive: boolean,
) {
  const [showStickyRegen, setShowStickyRegen] = useState(false);
  const [shouldScrollToRegenMessage, setShouldScrollToRegenMessage] = useState(false);
  const [focusHighlight, setFocusHighlight] = useState<"aiPrompt" | "regenMessage" | null>(null);

  const regenMessageRef = useRef<HTMLDivElement | null>(null);
  const aiPromptRef = useRef<HTMLDivElement | null>(null);
  const focusHighlightTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeView !== "plan") return;
    if (!milestoneDropdownRef.current) return;

    const target = milestoneDropdownRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyRegen(!entry.isIntersecting);
      },
      { root: null, threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [activeView, milestoneDropdownRef]);

  useEffect(() => {
    if (!shouldScrollToRegenMessage) return;
    if (aiPromptRef.current) {
      aiPromptRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      const aiPromptTimeout = setTimeout(() => {
        setFocusHighlight("aiPrompt");
        setShouldScrollToRegenMessage(false);
      }, 0);
      return () => clearTimeout(aiPromptTimeout);
    }
    if (regenMessageRef.current) {
      regenMessageRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      const regenTimeout = setTimeout(() => {
        setFocusHighlight("regenMessage");
        setShouldScrollToRegenMessage(false);
      }, 0);
      return () => clearTimeout(regenTimeout);
    }
    if (!aiPromptActive && !regenMessageActive) {
      const clearTimeoutId = setTimeout(() => {
        setShouldScrollToRegenMessage(false);
      }, 0);
      return () => clearTimeout(clearTimeoutId);
    }
  }, [shouldScrollToRegenMessage, aiPromptActive, regenMessageActive]);

  useEffect(() => {
    if (!focusHighlight) return;
    if (focusHighlightTimeout.current) clearTimeout(focusHighlightTimeout.current);
    focusHighlightTimeout.current = setTimeout(() => setFocusHighlight(null), 1200);
    return () => {
      if (focusHighlightTimeout.current) clearTimeout(focusHighlightTimeout.current);
    };
  }, [focusHighlight]);

  const shouldShowStickyRegen = activeView === "plan" && hasPlanTasks && showStickyRegen;

  return {
    showStickyRegen: shouldShowStickyRegen,
    shouldScrollToRegenMessage,
    setShouldScrollToRegenMessage,
    focusHighlight,
    regenMessageRef,
    aiPromptRef,
  };
}
