import { NextRequest, NextResponse } from "next/server";
import { readServerState } from "@/lib/server-store";

export async function GET(req: NextRequest) {
  const state = await readServerState();
  if (!state) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  let milestones = state.milestones;
  if (projectId) milestones = milestones.filter((m) => m.projectId === projectId);

  const enriched = milestones.map((m) => {
    const tasks = state.tasks.filter((t) => t.milestoneId === m.id);
    return {
      ...m,
      taskStats: {
        total: tasks.length,
        todo: tasks.filter((t) => t.status === "todo").length,
        doing: tasks.filter((t) => t.status === "doing").length,
        done: tasks.filter((t) => t.status === "done").length,
      },
    };
  });

  return NextResponse.json(enriched);
}
