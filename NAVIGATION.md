# Navigation

## High-level map
- `app/page.tsx` is the primary UI and state orchestration file. It is currently monolithic and contains most view logic.
- `lib/store.ts` holds the Zustand store (state + actions).
- `lib/types.ts` defines core types used across UI and store.
- `app/api/ai/*` contains the AI endpoints used by the planner.

## `app/page.tsx` landmarks
- Sidebar context + milestones: search for `LEFT SIDEBAR` and the `New milestone...` input.
- AI generation flow: search for `handleGenerateTasks`, `runAiGeneration`, and `AI tasks` batch header.
- Task list rendering: search for `planTasks.map` (includes pin/unpin + batch grouping).
- Focus view: search for `Focus view` and `Clear focus` button.
- Activity Trail: search for `Activity Trail` and `scopedActivities`.

## AI endpoints
- `app/api/ai/generate-tasks/route.ts`: task generation prompt and schema.
- `app/api/ai/generate-milestones/route.ts`: milestone generation prompt and schema.
