import { NextRequest, NextResponse } from "next/server";
import { readServerState } from "@/lib/server-store";

export async function GET(req: NextRequest) {
  const state = await readServerState();
  if (!state) return NextResponse.json(null);

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const plan = state.dailyPlans.find(
    (p) => p.projectId === projectId && p.date === date,
  );
  if (!plan) return NextResponse.json(null);

  const taskMap = new Map(state.tasks.map((t) => [t.id, t]));
  const milestoneMap = new Map(state.milestones.map((m) => [m.id, m.title]));
  const tasks = plan.taskIds
    .map((id) => taskMap.get(id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined)
    .map((t) => ({
      ...t,
      milestoneTitle: t.milestoneId ? milestoneMap.get(t.milestoneId) : undefined,
    }));

  return NextResponse.json({ ...plan, tasks });
}
