"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

const getScrollParent = (element: HTMLElement): HTMLElement | null => {
  let parent = element.parentElement;
  while (parent) {
    const styles = window.getComputedStyle(parent);
    const isScrollableY = /(auto|scroll|overlay)/.test(styles.overflowY);
    if (isScrollableY && parent.scrollHeight > parent.clientHeight) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
};

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
    if (activeView !== "plan" || !hasPlanTasks) return;

    let frameId = 0;
    let observer: IntersectionObserver | null = null;
    let cancelled = false;

    const setupObserver = () => {
      if (cancelled) return;
      const target = milestoneDropdownRef.current;
      if (!target) {
        frameId = window.requestAnimationFrame(setupObserver);
        return;
      }

      const scrollRoot = getScrollParent(target);
      observer = new IntersectionObserver(
        ([entry]) => {
          setShowStickyRegen(!entry.isIntersecting);
        },
        {
          root: scrollRoot,
          threshold: 0,
          // Header overlays top content, so treat that area as out of view.
          rootMargin: "-64px 0px 0px 0px",
        },
      );
      observer.observe(target);
    };

    setupObserver();

    return () => {
      cancelled = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      observer?.disconnect();
    };
  }, [activeView, hasPlanTasks, milestoneDropdownRef]);

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
