# Navigation

## High-level map
- `app/page.tsx` hydrates state from storage and persists changes.
- `app/layout/AppShell.tsx` is the app shell and view router.
- `lib/store.ts` holds the Zustand store (state + actions).
- `lib/types.ts` defines domain types used across UI and store.
- `lib/selectors.ts` holds derived selectors and filters.
- `app/api/ai/*` contains AI endpoints (tasks, milestones, brainstorm).
- `app/api/voice/transcribe/route.ts` contains the voice proxy.

## Views
- `app/views/OnboardingView.tsx`: initial screen (Create Project).
- `app/views/plan/index.tsx`: plan view orchestration.
- `app/views/FocusView.tsx`: focus-only task display.
- `app/views/HistoryView.tsx`: analytics + recent completion history.
- `app/views/BrainstormView.tsx`: drawing board chat and draft canvas.
- `app/views/settings/index.tsx`: project settings + milestone editing.

## Layout
- `app/layout/AppHeader.tsx`: top nav + date control + voice capture.
- `app/layout/LeftSidebar.tsx`: project context, milestones, progress.
- `app/layout/RightSidebar.tsx`: activity panel + Today/All toggle.

## Plan view landmarks (`app/views/plan/index.tsx`)
- Budget + override: search `BudgetBar` and `handlePlanBudgetOverrideChange`.
- Milestone targeting: search `MilestoneSelector` and `selectedMilestoneId`.
- AI generation: search `handleGenerateTasks` and `runAiGeneration`.
- Manual tasks: search `ManualTaskForm` and `handleAddManualTask`.
- Task list rendering: search `planTasks.map` and `TaskCard`.
- Sticky regen bar: search `StickyRegenBar` and `useStickyRegenBar`.

## AI endpoints
- `app/api/ai/generate-tasks/route.ts`: task generation prompt, schema, scope filtering.
- `app/api/ai/generate-milestones/route.ts`: milestone generation prompt, schema.
- `app/api/ai/brainstorm/route.ts`: brainstorm flow + draft updates.

## Storage + Persistence
- `lib/storage.ts`: IndexedDB + localStorage fallback, schema normalization.
- `app/page.tsx`: debounced save (300ms).
