import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { AppState } from "./types";

const DATA_DIR = join(process.cwd(), "data");
const STATE_FILE = join(DATA_DIR, "planner-state.json");

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
