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
      // Prefer server state so MCP agent changes are reflected on reload
      try {
        const res = await fetch("/api/mcp/sync");
        if (res.ok) {
          const serverState = await res.json();
          if (serverState) {
            hydrate(serverState);
            await saveState(serverState);
            return;
          }
        }
      } catch {
        // fall through to local storage
      }
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
        // Keep server-side state in sync so MCP server sees latest data
        fetch("/api/mcp/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
        }).catch(() => {});
      }, 300);
    });
    return () => unsub();
  }, []);

  return <AppShell />;
}
