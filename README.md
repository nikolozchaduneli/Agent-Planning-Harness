# Task Centric Planner

A local-first daily planner built around one core idea: **focus on one project per day**.

Instead of juggling five things at once, you pick a single project, set a time budget, and plan tasks scoped to milestones. AI can suggest milestones and tasks for you, but the app works fully offline without it.

## Why

Most planners let you scatter tasks across dozens of projects. This one forces focus: one project, one day, one plan. You brainstorm a project, break it into milestones, generate or hand-write tasks, then execute them one at a time in Focus view.

## How it works

1. **Brainstorm** - Pitch a project idea to the AI Drawing Board. It helps you shape the scope, milestones, and constraints before you commit.
2. **Plan** - Pick a milestone, set a time budget, and generate or manually add tasks for today. Pin the ones you like, regenerate the rest.
3. **Focus** - Lock onto one task. Generate a structured AI prompt you can paste into any assistant to get implementation help.
4. **History** - Track what you completed and when. See progress over time per project.

Everything is stored in your browser (IndexedDB). No account, no server, no data leaves your machine unless you opt into AI features.

## Screenshots

| Onboarding | Drawing Board | Plan |
|---|---|---|
| ![Onboarding](docs/ui/ui-01-onboarding.png) | ![Drawing Board](docs/ui/ui-11-drawing-board-suggestions.png) | ![Plan](docs/ui/ui-06-manual-task-added.png) |

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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
  views/           # User-facing screens (Plan, Focus, History, Settings, Brainstorm)
  components/      # Shared components (TaskCard, DictationMic, etc.)
  hooks/           # Client orchestration (AI generation, voice, drafts)
  layout/          # App shell, sidebars, header
lib/
  store.ts         # Zustand store and actions
  selectors.ts     # Derived state reads
  types.ts         # Domain types
  storage.ts       # Persistence layer
```

## License

MIT
