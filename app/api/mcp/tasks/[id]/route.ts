import { NextRequest, NextResponse } from "next/server";
import { readServerState, writeServerState, markAgentDirty } from "@/lib/server-store";
import type { TaskStatus } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const state = await readServerState();
  if (!state) return NextResponse.json({ error: "No state found" }, { status: 404 });

  const taskIndex = state.tasks.findIndex((t) => t.id === id);
  if (taskIndex === -1) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await req.json();
  const { status } = body as { status: TaskStatus };

  if (!["todo", "doing", "done"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const task = state.tasks[taskIndex];
  const now = new Date().toISOString();
  const updatedTask = {
    ...task,
    status,
    updatedAt: now,
    completedAt: status === "done" ? now : undefined,
  };

  state.tasks[taskIndex] = updatedTask;
  state.progressEntries.push({
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    projectId: task.projectId,
    taskId: task.id,
    status,
  });
  state.activities.unshift({
    id: crypto.randomUUID(),
    projectId: task.projectId,
    description: `Agent moved task "${task.title}" to ${status}.`,
    timestamp: new Date().toISOString(),
  });

  await writeServerState(state);
  await markAgentDirty();
  return NextResponse.json(updatedTask);
}
