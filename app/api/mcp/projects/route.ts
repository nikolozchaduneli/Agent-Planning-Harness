import { NextResponse } from "next/server";
import { readServerState } from "@/lib/server-store";

export async function GET() {
  const state = await readServerState();
  if (!state) return NextResponse.json([]);

  const projects = state.projects.map((project) => {
    const tasks = state.tasks.filter((t) => t.projectId === project.id);
    const milestones = state.milestones.filter((m) => m.projectId === project.id);
    return {
      ...project,
      milestoneCount: milestones.length,
      taskStats: {
        total: tasks.length,
        todo: tasks.filter((t) => t.status === "todo").length,
        doing: tasks.filter((t) => t.status === "doing").length,
        done: tasks.filter((t) => t.status === "done").length,
      },
    };
  });

  return NextResponse.json(projects);
}
