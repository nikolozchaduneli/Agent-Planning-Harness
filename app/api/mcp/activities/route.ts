import { NextRequest, NextResponse } from "next/server";
import { readServerState, writeServerState, markAgentDirty } from "@/lib/server-store";
import type { Activity } from "@/lib/types";

export async function POST(req: NextRequest) {
  const state = await readServerState();
  if (!state) return NextResponse.json({ error: "No state found" }, { status: 404 });

  const body = await req.json();
  const { projectId, description } = body;

  if (!projectId || !description) {
    return NextResponse.json(
      { error: "projectId and description are required" },
      { status: 400 },
    );
  }

  const activity: Activity = {
    id: crypto.randomUUID(),
    projectId,
    description,
    timestamp: new Date().toISOString(),
  };

  state.activities.unshift(activity);
  await writeServerState(state);
  await markAgentDirty();
  return NextResponse.json(activity, { status: 201 });
}
