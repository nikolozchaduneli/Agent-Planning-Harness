# Task Centric Planner - AGENTS

## Purpose
- Persist project flow, structure, and working agreements so new threads start productive fast.
- Prefer these instructions over re-discovery; update this file when project behavior changes.

## Product Summary
- Web MVP for project-first daily planning with AI-suggested tasks, timeboxing, milestones, and progress history.
- Data is local-only in the browser (IndexedDB primary, localStorage fallback).
- AI features are optional; tasks/milestones fall back to safe stub data when Azure credentials are missing (brainstorm returns an offline message and preserves the draft).

## App Flow (End-to-End)
- Project creation captures name, goal, daily time budget, optional focus notes (brainstorm promotion currently defaults time budget to 60 and uses draft constraints as focus notes).
- Daily plan is created lazily per project + date and tracks task IDs + optional time override.
- Task generation uses `/api/ai/generate-tasks` and respects budget + milestone scope; pinned tasks should persist.
- Manual tasks can be added anytime and are attached to the daily plan.
- Focus view isolates a single task and logs progress updates.
- History view aggregates completion stats and last 10 days of completed tasks.
- Voice transcription posts audio to `/api/voice/transcribe`; transcript can be appended to plan notes.

## Architecture Overview
- Next.js 16 App Router, React 19, Tailwind v4.
- Global state via Zustand in `lib/store.ts` with actions and local persistence.
- Storage helpers in `lib/storage.ts` (IndexedDB with localStorage fallback).
- UI composed in `app/layout/AppShell.tsx` with view switching.

## Key Files and Responsibilities
- `app/page.tsx`: client entry; hydrates store from storage and persists on changes.
- `app/layout/AppShell.tsx`: main layout, view routing, sidebars.
- `lib/store.ts`: Zustand state + actions; update here for state behavior.
- `lib/types.ts`: source of truth for domain types.
- `lib/selectors.ts`: derived selectors; prefer adding selectors over duplicating logic.
- `app/views/plan/index.tsx`: plan screen orchestration (budget, milestones, tasks).
- `app/components/TaskCard.tsx`: task UI + edit/pin/focus controls.
- `app/api/ai/*`: AI endpoints (tasks, milestones, brainstorm) with Zod validation.
- `app/api/voice/transcribe/route.ts`: Azure voice proxy (multipart/form-data).
- `FLOW.md` and `NAVIGATION.md`: deeper flow + wayfinding references.
- `TESTING.md` and `TESTING_ISSUES.md`: manual QA checklists and known issues.

## State + Data Model Notes
- Dates are stored as ISO `YYYY-MM-DD` (see `lib/constants.ts`).
- Tasks store `source`, `aiBatchId`, and `pinned` for AI regeneration behavior.
- Daily plans store `timeBudgetOverrideMinutes` (legacy `timeBudgetMinutes` is normalized in storage).
- Activity feed is stored in `activities` and scoped by date in `selectScopedActivities`.

## AI Behavior Expectations
- Task generation must respect milestone scope and total time budget.
- Pinned tasks should remain across regenerate; unpinned can be replaced.
- When milestone scope conflicts exist, filter and warn (see `scopeWarning`).
- Brainstorming aims to conclude by turn 4-5 and sets `isReady: true` when milestones are defined.

## Local Dev
- Install: `npm install`
- Dev server: `npm run dev` (uses `scripts/dev.js` to ensure module resolution)
- App runs at `http://localhost:3000`

## Environment Variables
- AI tasks/milestones/brainstorm (Azure Responses API):
- `AZURE_OPENAI_ENDPOINT` or `AZURE_OPENAI_RESPONSES_URL`
- `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_API_VERSION`
- Voice transcription:
- `AZURE_VOICE_ENDPOINT`, `AZURE_VOICE_API_KEY`, `AZURE_VOICE_DEPLOYMENT`, `AZURE_VOICE_API_VERSION`

## Styling + UI Conventions
- Design language uses CSS variables in `app/globals.css` (ink/paper/accent/panel).
- Tailwind utility classes are used directly in components; avoid introducing new CSS files unless needed.
- Buttons are rounded pills with uppercase tracking; keep consistency with existing classes.
- Use `tw` constants in `lib/constants.ts` for common inputs/labels.

## Good Practices
- Keep mutations centralized in `lib/store.ts` and selectors in `lib/selectors.ts`.
- Prefer small, focused components; avoid bloating `app/views/plan/index.tsx` further.
- When modifying AI flows, update both client logic (`useAiGeneration`) and API route behavior.
- Add or update notes in `FLOW.md`, `NAVIGATION.md`, or `TESTING_ISSUES.md` when behavior changes.
- Preserve local-only data model assumptions (no backend persistence unless explicitly added).

## Manual QA (When Requested)
- Follow `TESTING.md` exactly, including the no-install and no-file-changes constraints during testing.
- Log new issues in `TESTING_ISSUES.md` with date, impact, evidence, and suggested fix.
