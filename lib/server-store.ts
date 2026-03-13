import { readFile, writeFile, mkdir, stat, unlink } from "fs/promises";
import { join } from "path";
import type { AppState } from "./types";

const DATA_DIR = join(process.cwd(), "data");
const STATE_FILE = join(DATA_DIR, "planner-state.json");
const DIRTY_FILE = join(DATA_DIR, ".agent-dirty");

export async function readServerState(): Promise<AppState | null> {
  try {
    const raw = await readFile(STATE_FILE, "utf-8");
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
}

export async function writeServerState(state: AppState): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

// Dirty flag: set by MCP write routes, cleared by the SSE endpoint after pushing.
// The browser sync POST deliberately does NOT set this, breaking the feedback loop.
export async function markAgentDirty(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DIRTY_FILE, "", "utf-8");
}

export async function isAgentDirty(): Promise<boolean> {
  try {
    await stat(DIRTY_FILE);
    return true;
  } catch {
    return false;
  }
}

export async function clearAgentDirty(): Promise<void> {
  try {
    await unlink(DIRTY_FILE);
  } catch {
    // already gone, ignore
  }
}
