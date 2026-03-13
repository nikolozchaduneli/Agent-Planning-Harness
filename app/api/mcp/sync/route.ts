import { NextRequest, NextResponse } from "next/server";
import { readServerState, writeServerState } from "@/lib/server-store";
import type { AppState, Task } from "@/lib/types";

export async function GET() {
  const state = await readServerState();
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  try {
    const incoming = (await req.json()) as AppState;
    const existing = await readServerState();

    // Merge: use browser state as base, but preserve any entities that MCP
    // created server-side that the browser doesn't know about yet.
    const merged: AppState = existing
      ? {
          ...incoming,
          tasks: mergeTasks(incoming.tasks, existing.tasks),
          milestones: mergeById(incoming.milestones, existing.milestones),
          activities: mergeById(incoming.activities, existing.activities),
          progressEntries: mergeById(
            incoming.progressEntries,
            existing.progressEntries
          ),
        }
      : incoming;

    await writeServerState(merged);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// For tasks: use updatedAt (falling back to createdAt) to pick the winner per entity.
function mergeTasks(browser: Task[], server: Task[]): Task[] {
  const serverMap = new Map(server.map((t) => [t.id, t]));
  const result = browser.map((bt) => {
    const st = serverMap.get(bt.id);
    if (!st) return bt;
    const bTime = bt.updatedAt ?? bt.createdAt;
    const sTime = st.updatedAt ?? st.createdAt;
    return sTime > bTime ? st : bt;
  });
  const browserIds = new Set(browser.map((t) => t.id));
  server.filter((t) => !browserIds.has(t.id)).forEach((t) => result.push(t));
  return result;
}

// For append-only entities: keep browser's version of known ones; append server-only ones.
function mergeById<T extends { id: string }>(browser: T[], server: T[]): T[] {
  const browserIds = new Set(browser.map((x) => x.id));
  const serverOnly = server.filter((x) => !browserIds.has(x.id));
  return [...browser, ...serverOnly];
}
