import { openDB } from "idb";
import type { AppState } from "./types";

const DB_NAME = "task-organizer";
const DB_VERSION = 1;
const STORE_NAME = "app_state";
const STATE_KEY = "root";
const LS_KEY = "task-organizer.state.v1";

const getDb = async () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });

export const loadState = async (): Promise<AppState | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const db = await getDb();
    const stored = await db.get(STORE_NAME, STATE_KEY);
    if (stored) {
      return stored as AppState;
    }
  } catch {
    // fall back to localStorage
  }

  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
};

export const saveState = async (state: AppState): Promise<void> => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const db = await getDb();
    await db.put(STORE_NAME, state, STATE_KEY);
    return;
  } catch {
    // fall back to localStorage
  }

  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // ignore write failures
  }
};
