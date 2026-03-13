# Task Centric Planner

**Project management for the age of LLM agents.**

We outsourced a chunk of our cognition to LLMs — especially the organizational part. The irony is that the tools meant to help us think have made it harder to start, easier to scatter, and trivial to drown in half-finished plans. Azure DevOps, Jira, Linear — they were built for teams of humans coordinating with humans. None of them were designed for a world where an autonomous agent needs a structured plan, external memory, and a progress tracker to do real work.

This project is building that layer.

## The vision

**Phase 1 (done):** A local-first planner that forces single-project focus. One project, one day, one plan. AI helps you brainstorm scope, propose milestones, generate tasks, and produce execution prompts — but never takes the wheel. You stay in control of what matters today.

**Phase 2 (done):** An MCP server that exposes this planner as structured external memory for LLM agents. Any agent — coding, research, creative — can read the plan, pick up tasks, report progress, and request new work. The planner becomes the harness: **ideation → structurization → tracking**, fully autonomous.

- **Daily plan as first-class primitive** — agents call one tool and know exactly what's in scope for today.
- **Self-directed task loop** — agents find work, claim it (`pick_task`), execute, and complete in a repeatable cycle. No human dispatch needed.
- **Activity feed as communication channel** — agent notes appear in the browser UI in real time. No external notification system required.
- **Real-time sync** — agent changes propagate to the browser within ~1 second via SSE, no reload required. A dirty-flag mechanism prevents feedback loops between browser and agent writes.

The end state is a system where you sketch a project idea over coffee, the planner breaks it into milestones and tasks, and agents execute against it — with you reviewing progress, not managing process.

## How it works today

1. **Brainstorm** — Pitch a project idea to the AI Drawing Board. It shapes scope, milestones, and constraints before you commit.
2. **Plan** — Pick a milestone, set a time budget, generate or hand-write tasks. Pin what you like, regenerate the rest.
3. **Focus** — Lock onto one task. Generate a structured prompt you can paste into any AI assistant for implementation help.
4. **History** — Track completions over time per project.

Everything is stored in your browser (IndexedDB). No account, no server, no data leaves your machine unless you opt into AI features.

## Feature demos

| Drawing Board | Plan | Focus |
|---|---|---|
| ![Drawing Board](docs/ui/gif-01-drawing-board.gif) | ![Plan](docs/ui/gif-02-plan-tasks.gif) | ![Focus](docs/ui/gif-03-focus-prompt.gif) |

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## MCP server (agent integration)

The MCP server lets any MCP-compatible agent (Claude Code, custom agents) interact with your planner directly.

```bash
npm run mcp:install   # install mcp-server deps (first time)
npm run mcp:build     # compile TypeScript
```

`.mcp.json` is already configured — Claude Code picks it up automatically when the app is running on port 3000.

**Available tools (9):** `list_projects`, `list_milestones`, `get_today_plan`, `list_tasks`, `pick_task`, `complete_task`, `update_task_status`, `create_task`, `log_progress`

See [`mcp-server/README.md`](mcp-server/README.md) for the full protocol and agent workflow.

## AI features (optional)

AI features (task generation, milestone proposals, brainstorm, focus prompts, voice transcription) use Azure OpenAI. Without credentials, every endpoint returns safe fallback behavior — the app remains fully functional.

Copy `.env.local.example` to `.env.local` and fill in your values:

```
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_RESPONSES_URL=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_DEPLOYMENT=
AZURE_OPENAI_API_VERSION=2024-10-21

AZURE_VOICE_ENDPOINT=
AZURE_VOICE_API_KEY=
AZURE_VOICE_DEPLOYMENT=
AZURE_VOICE_API_VERSION=2025-03-01-preview
```

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript**, **Tailwind v4**
- **Zustand** for state, **Zod** for validation
- **IndexedDB** (primary) + localStorage (fallback) for persistence
- Azure OpenAI Responses API for AI features

## Project structure

```
app/
  api/ai/          # AI routes (tasks, milestones, brainstorm, focus prompts)
  api/voice/       # Voice transcription proxy
  api/mcp/         # MCP REST API (sync, projects, tasks, milestones, plans, activities, stream)
  views/           # User-facing screens (Plan, Focus, History, Settings, Brainstorm)
  components/      # Shared components (TaskCard, DictationMic, etc.)
  hooks/           # Client orchestration (AI generation, voice, drafts)
  layout/          # App shell, sidebars, header
lib/
  store.ts         # Zustand store and actions
  selectors.ts     # Derived state reads
  types.ts         # Domain types
  storage.ts       # Persistence layer
  server-store.ts  # Server-side file store (data/planner-state.json) + dirty flag helpers
mcp-server/        # Standalone stdio MCP server — exposes planner to AI agents
data/              # Runtime state (planner-state.json) — gitignored
```

## License

Apache-2.0
