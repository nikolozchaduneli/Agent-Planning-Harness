"use client";

import { useEffect, useRef } from "react";
import { loadState, saveState } from "@/lib/storage";
import { getInitialState, useAppStore } from "@/lib/store";
import type { AppState } from "@/lib/types";
import AppShell from "@/app/layout/AppShell";

export default function Home() {
  const hydrate = useAppStore((state) => state.hydrate);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const init = async () => {
      const stored = await loadState();
      if (stored) {
        hydrate(stored);
        return;
      }
      hydrate(getInitialState());
    };
    init();
  }, [hydrate]);

  useEffect(() => {
    const unsub = useAppStore.subscribe((state: AppState) => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
      saveTimer.current = setTimeout(() => {
        saveState(state);
      }, 300);
    });
    return () => unsub();
  }, []);

  return <AppShell />;
}
