import { openDB } from "idb";
import type { AppState, DailyPlan } from "./types";

const DB_NAME = "task-organizer";
const DB_VERSION = 1;
const STORE_NAME = "app_state";
const STATE_KEY = "root";
const LS_KEY = "task-organizer.state.v1";
const THEME_SCHEMES = new Set(["sage", "mist", "dawn"]);

const getDb = async () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });

const normalizeState = (state: AppState): AppState => {
  const migratedPlans = state.dailyPlans.map((plan) => {
    const legacyPlan = plan as DailyPlan & { timeBudgetMinutes?: number };
    if (typeof legacyPlan.timeBudgetMinutes === "number") {
      const { timeBudgetMinutes, ...rest } = legacyPlan;
      return { ...rest, timeBudgetOverrideMinutes: timeBudgetMinutes };
    }
    return plan;
  });
  const nextThemeScheme = THEME_SCHEMES.has(state.ui.themeScheme)
    ? state.ui.themeScheme
    : "sage";
  return {
    ...state,
    dailyPlans: migratedPlans,
    ui: {
      ...state.ui,
      themeScheme: nextThemeScheme,
    },
  };
};

export const loadState = async (): Promise<AppState | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const db = await getDb();
    const stored = await db.get(STORE_NAME, STATE_KEY);
    if (stored) {
      return normalizeState(stored as AppState);
    }
  } catch {
    // fall back to localStorage
  }

  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) {
      return null;
    }
    return normalizeState(JSON.parse(raw) as AppState);
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
