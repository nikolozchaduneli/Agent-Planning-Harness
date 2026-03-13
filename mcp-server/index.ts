#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BASE_URL = process.env.PLANNER_URL ?? "http://localhost:3000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (err) {
    throw new Error(
      `Cannot reach planner at ${BASE_URL}. Is the app running? (npm run dev)\n${err}`,
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

const server = new Server(
  { name: "task-centric-planner", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_projects",
      description:
        "List all projects with milestone counts and task stats (todo/doing/done). Start here to discover what projects exist.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_milestones",
      description:
        "List milestones for a project with per-milestone task completion stats.",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
        },
        required: ["project_id"],
      },
    },
    {
      name: "get_today_plan",
      description:
        "Get the daily plan for a project on a given date (defaults to today). Returns all planned tasks with current statuses.",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          date: {
            type: "string",
            description: "Date in YYYY-MM-DD format (optional, defaults to today)",
          },
        },
        required: ["project_id"],
      },
    },
    {
      name: "list_tasks",
      description:
        "List tasks for a project. Filter by milestone or status. Use status='todo' to find available work.",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          milestone_id: {
            type: "string",
            description: "Filter by milestone ID (optional)",
          },
          status: {
            type: "string",
            enum: ["todo", "doing", "done", "all"],
            description: "Filter by status (optional, defaults to 'all')",
          },
        },
        required: ["project_id"],
      },
    },
    {
      name: "pick_task",
      description:
        "Claim a task by marking it as 'doing'. Call this before starting work so other agents know it is taken.",
      inputSchema: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "Task ID to claim" },
        },
        required: ["task_id"],
      },
    },
    {
      name: "complete_task",
      description:
        "Mark a task as 'done'. Optionally include a progress note that appears in the project activity feed.",
      inputSchema: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "Task ID to complete" },
          note: {
            type: "string",
            description: "Optional progress note to log as an activity",
          },
        },
        required: ["task_id"],
      },
    },
    {
      name: "update_task_status",
      description: "Set a task's status to 'todo', 'doing', or 'done'.",
      inputSchema: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "Task ID" },
          status: {
            type: "string",
            enum: ["todo", "doing", "done"],
            description: "New status",
          },
        },
        required: ["task_id", "status"],
      },
    },
    {
      name: "create_task",
      description:
        "Create a new task in a project. The task is automatically added to today's daily plan. Use this to add work items that don't exist yet.",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          milestone_id: {
            type: "string",
            description: "Milestone ID to attach the task to (optional)",
          },
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Task description (optional)" },
          estimate_minutes: {
            type: "number",
            description: "Estimated minutes to complete (optional, defaults to 30)",
          },
        },
        required: ["project_id", "title"],
      },
    },
    {
      name: "log_progress",
      description:
        "Log a progress note to a project's activity feed. Use this to communicate status, blockers, or decisions.",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          description: {
            type: "string",
            description: "Description of progress, activity, or decision made",
          },
        },
        required: ["project_id", "description"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case "list_projects": {
        const projects = await apiFetch<unknown[]>("/api/mcp/projects");
        return { content: [{ type: "text", text: JSON.stringify(projects, null, 2) }] };
      }

      case "list_milestones": {
        const { project_id } = args as { project_id: string };
        const milestones = await apiFetch<unknown[]>(
          `/api/mcp/milestones?projectId=${encodeURIComponent(project_id)}`,
        );
        return { content: [{ type: "text", text: JSON.stringify(milestones, null, 2) }] };
      }

      case "get_today_plan": {
        const { project_id, date } = args as { project_id: string; date?: string };
        const params = new URLSearchParams({ projectId: project_id });
        if (date) params.set("date", date);
        const plan = await apiFetch<unknown>(`/api/mcp/plans?${params}`);
        return { content: [{ type: "text", text: JSON.stringify(plan, null, 2) }] };
      }

      case "list_tasks": {
        const { project_id, milestone_id, status } = args as {
          project_id: string;
          milestone_id?: string;
          status?: string;
        };
        const params = new URLSearchParams({ projectId: project_id });
        if (milestone_id) params.set("milestoneId", milestone_id);
        if (status && status !== "all") params.set("status", status);
        const tasks = await apiFetch<unknown[]>(`/api/mcp/tasks?${params}`);
        return { content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }] };
      }

      case "pick_task": {
        const { task_id } = args as { task_id: string };
        const task = await apiFetch<unknown>(`/api/mcp/tasks/${task_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "doing" }),
        });
        return { content: [{ type: "text", text: JSON.stringify(task, null, 2) }] };
      }

      case "complete_task": {
        const { task_id, note } = args as { task_id: string; note?: string };
        const task = await apiFetch<{ projectId: string }>(`/api/mcp/tasks/${task_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "done" }),
        });
        if (note) {
          await apiFetch("/api/mcp/activities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId: task.projectId, description: note }),
          });
        }
        return { content: [{ type: "text", text: JSON.stringify(task, null, 2) }] };
      }

      case "update_task_status": {
        const { task_id, status } = args as { task_id: string; status: string };
        const task = await apiFetch<unknown>(`/api/mcp/tasks/${task_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        return { content: [{ type: "text", text: JSON.stringify(task, null, 2) }] };
      }

      case "create_task": {
        const { project_id, milestone_id, title, description, estimate_minutes } = args as {
          project_id: string;
          milestone_id?: string;
          title: string;
          description?: string;
          estimate_minutes?: number;
        };
        const task = await apiFetch<unknown>("/api/mcp/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project_id,
            milestoneId: milestone_id,
            title,
            description,
            estimateMinutes: estimate_minutes,
          }),
        });
        return { content: [{ type: "text", text: JSON.stringify(task, null, 2) }] };
      }

      case "log_progress": {
        const { project_id, description } = args as {
          project_id: string;
          description: string;
        };
        const activity = await apiFetch<unknown>("/api/mcp/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project_id, description }),
        });
        return { content: [{ type: "text", text: JSON.stringify(activity, null, 2) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("Task Centric Planner MCP server running\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});
