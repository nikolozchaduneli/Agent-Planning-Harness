import { NextRequest, NextResponse } from "next/server";
import { readServerState, writeServerState } from "@/lib/server-store";
import type { Task } from "@/lib/types";

export async function GET(req: NextRequest) {
  const state = await readServerState();
  if (!state) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const milestoneId = searchParams.get("milestoneId");
  const status = searchParams.get("status");

  let tasks = state.tasks;
  if (projectId) tasks = tasks.filter((t) => t.projectId === projectId);
  if (milestoneId) tasks = tasks.filter((t) => t.milestoneId === milestoneId);
  if (status && status !== "all") tasks = tasks.filter((t) => t.status === status);

  const milestoneMap = new Map(state.milestones.map((m) => [m.id, m.title]));
  const enriched = tasks.map((t) => ({
    ...t,
    milestoneTitle: t.milestoneId ? milestoneMap.get(t.milestoneId) : undefined,
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const state = await readServerState();
  if (!state) return NextResponse.json({ error: "No state found" }, { status: 404 });

  const body = await req.json();
  const { projectId, milestoneId, title, description, estimateMinutes } = body;

  if (!projectId || !title) {
    return NextResponse.json({ error: "projectId and title are required" }, { status: 400 });
  }

  const project = state.projects.find((p) => p.id === projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const task: Task = {
    id: crypto.randomUUID(),
    projectId,
    milestoneId: milestoneId ?? undefined,
    title,
    description: description ?? undefined,
    estimateMinutes: estimateMinutes ?? 30,
    status: "todo",
    source: "manual",
    createdAt: new Date().toISOString(),
  };

  state.tasks.push(task);
  state.activities.unshift({
    id: crypto.randomUUID(),
    projectId,
    description: `Agent created task "${title}".`,
    timestamp: new Date().toISOString(),
  });

  await writeServerState(state);
  return NextResponse.json(task, { status: 201 });
}
