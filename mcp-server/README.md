# Task Centric Planner — MCP Server

Lets AI agents read your daily plan, claim tasks, mark them done, and log progress — directly from Claude Code or Claude Desktop.

## How it works

```
Agent (Claude Code / Claude Desktop)
  │  MCP protocol (stdio)
  ▼
mcp-server/dist/index.js
  │  HTTP  →  localhost:3000/api/mcp/*
  ▼
Next.js API routes  ←→  data/planner-state.json
  ▲
Browser (IndexedDB) ──── syncs on every state change (300ms debounce)
```

**Note:** Agent changes are visible in the browser on the next page reload. The browser pushes its state to the server within 300ms of each mutation, so both sides stay current across sessions.

No external database is involved. All data stays on your machine.

## Setup

Prerequisites: Node.js 18+, the planner app running (`npm run dev`).

```bash
npm run mcp:install   # installs mcp-server dependencies
npm run mcp:build     # compiles TypeScript → mcp-server/dist/
```

### After modifying mcp-server/index.ts

```bash
npm run mcp:build
# then reload the MCP server in Claude Code, or restart Claude Desktop
```

## Connecting Claude Code

A `.mcp.json` at the repo root configures Claude Code automatically when you open this workspace. Claude Code shows `task-planner` as a connected server. The config for reference:

```json
{
  "mcpServers": {
    "task-planner": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "env": { "PLANNER_URL": "http://localhost:3000" }
    }
  }
}
```

Update `PLANNER_URL` if the app runs on a different port.

## Connecting Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "task-planner": {
      "command": "node",
      "args": ["/absolute/path/to/repo/mcp-server/dist/index.js"],
      "env": { "PLANNER_URL": "http://localhost:3000" }
    }
  }
}
```

## Tools

| Tool | Description |
|---|---|
| `list_projects` | List all projects with milestone counts and task stats. Start here. |
| `list_milestones` | List milestones for a project with task completion stats. |
| `get_today_plan` | Get today's plan for a project — all planned tasks with current statuses. |
| `list_tasks` | List tasks, filtered by milestone or status. `status: "todo"` = available work. |
| `pick_task` | Claim a task (`doing`) before starting work. |
| `complete_task` | Mark a task `done`. Optionally log a note to the activity feed. |
| `update_task_status` | Set any task to `todo`, `doing`, or `done`. |
| `create_task` | Add a task that doesn't exist in the current plan. |
| `log_progress` | Log a progress note, blocker, or decision to the activity feed. |

## Typical agent workflow

```
1. list_projects                         → find the project and its ID
2. list_milestones(project_id)           → understand the milestone structure
3. list_tasks(status: "todo")            → find available work
4. pick_task(task_id)                    → claim it before starting
5. ... do the work ...
6. complete_task(task_id, note: "Done")  → mark done, log note
7. create_task(...)                      → if new work was discovered
```
