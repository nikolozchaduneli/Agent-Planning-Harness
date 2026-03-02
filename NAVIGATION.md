# Navigation

Last updated: 2026-03-01
Use this as a fast map to where behavior actually lives.

## Entry points
- `app/page.tsx`: app bootstrap, hydration, and persistence subscription.
- `app/layout/AppShell.tsx`: global shell, first-run branching, view routing, responsive sidebars.
- First-run rule in `AppShell`: render `OnboardingView` by default, but render `BrainstormView` when `ui.activeView === "brainstorm"` even if no projects exist.
- `app/layout/AppHeader.tsx`: top navigation, date selection, global voice capture, activity-sidebar toggle.

## State and data core
- `lib/types.ts`: domain model.
- `lib/store.ts`: all state mutations/actions.
- `lib/selectors.ts`: derived reads (`active plan`, `plan tasks`, `scoped activities`, AI batch metadata, history).
- `lib/storage.ts`: IndexedDB/localStorage persistence + state normalization.
- `lib/constants.ts`, `lib/forms.ts`: shared UI/util helpers.
- `ui.planMilestoneByProject` in `lib/types.ts`/`lib/store.ts`: persisted per-project plan milestone scope map.

## Main views
- `app/views/OnboardingView.tsx`: first-run wrapper around create-project flow.
- `app/views/BrainstormView.tsx`: Drawing Board chat + live draft canvas.
- `app/views/plan/index.tsx`: plan orchestration (budget, milestone scope, notes, tasks, generation).
- `app/views/FocusView.tsx`: single-task execution view.
- `app/views/HistoryView.tsx`: completion stats + recent history.
- `app/views/settings/index.tsx`: project editing + milestone title/description editing + milestone regeneration + existing project picker.
- `app/views/settings/CreateProjectForm.tsx`: manual/AI-assisted creation entry.

## Plan view landmarks (`app/views/plan/index.tsx`)
- Active plan resolution: `activePlan`, `planTaskIds`, `planTasks`.
- Budget + override: `budget`, `hasBudgetOverride`, `handlePlanBudgetOverrideChange`, `clearPlanBudgetOverride`.
- Milestone scope: `selectedMilestoneId`, `selectedMilestone`, `MilestoneSelector`, `setPlanMilestoneForProject`.
- AI generation calls: `handleGenerate`, `handleRunAiGeneration`, `handleGenerateTasks`.
- Manual tasks: `handleAddManualTask`, `ManualTaskForm`.
- Task list + AI batch headers: `selectAiBatchMeta`, `TaskCard` mapping block.
- Sticky regenerate controls: `useStickyRegenBar`, `StickyRegenBar`.

## Shared components
- `app/components/TaskCard.tsx`: plan/focus task controls (status, estimate, pin, focus, delete, inline edits).
- `app/components/MilestoneListEditable.tsx`: milestone title/description edit + reorder/delete UI in Settings.
- `app/components/DictationMic.tsx`: mic button reused across forms.

## Hooks (behavior orchestration)
- `app/hooks/useAiGeneration.ts`: generation/regeneration decisions, budget math, API calls.
- `app/hooks/useBrainstorm.ts`: brainstorm submit loop and draft updates (`submitBrainstormMessage` powers both form submit and suggestion-chip direct submit).
- `app/hooks/useVoiceRecording.tsx`: recording lifecycle, transcription upload, shared provider.
- `app/hooks/useBudgetDisplay.ts`: budget animation + override panel state.
- `app/hooks/useStickyRegenBar.ts`: sticky regen visibility/focus guidance.
- `app/hooks/useProjectDrafts.ts`: editable settings drafts, dirty tracking, save/cancel behavior.

## API routes
- `app/api/ai/generate-tasks/route.ts`: AI task generation, schema validation, fallback tasks, milestone scope filtering.
- `app/api/ai/generate-milestones/route.ts`: milestone proposal generation + fallback milestones.
- `app/api/ai/brainstorm/route.ts`: iterative brainstorm responses and draft patching.
- `app/api/voice/transcribe/route.ts`: Azure voice proxy + fallback transcript.

## Cross-component event bridge
- `open-left-sidebar`: Plan title link -> `AppShell` opens left sidebar.
- `planning-milestone-select` / `planning-milestone-change`: sidebar milestone clicks <-> plan milestone selection sync.
- `open-settings-milestones`: sidebar Milestones section title click -> Settings milestones section scroll + inline edit focus (when a milestone id is provided).
- `global-transcript` / `apply-plan-notes`: header voice capture -> Plan notes insertion.

## Prompt assets
- `ai-prompts/*` contains prompt text assets.
- Current runtime API routes inline their prompts and do not read these files yet.

## Where to start for common changes
- Change how data mutates: `lib/store.ts` first.
- Change derived filtering/aggregation: `lib/selectors.ts`.
- Change plan behavior or generation UX: `app/views/plan/index.tsx` + `app/hooks/useAiGeneration.ts`.
- Change AI payload/validation/fallback: matching route under `app/api/ai/*`.
- Change voice UX/backend integration: `app/hooks/useVoiceRecording.tsx` + `app/api/voice/transcribe/route.ts`.
