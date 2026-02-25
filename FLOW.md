# App Flow

Last updated: 2026-02-25
Source of truth: current implementation in `app/*` and `lib/*`.

## Canonical User Flows
- Canonical flow specs now live in `flows/` with one file per flow.
- Start with `flows/README.md`, then open the specific flow file you need.
- Keep these flow files updated whenever user-visible behavior changes.

Flow list:
- `flows/01-first-visit-onboarding.md`
- `flows/02-brainstorm-to-project.md`
- `flows/03-manual-project-to-plan.md`
- `flows/04-milestone-lifecycle.md`
- `flows/05-task-lifecycle.md`
- `flows/06-daily-execution-and-history.md`
- `flows/07-settings-and-project-switching.md`
- `flows/08-offline-and-fallbacks.md`
- `flows/09-responsive-checkpoints.md`

## 1. App bootstrap and hydration
- `app/page.tsx` loads state from storage on mount (`loadState`) and falls back to `getInitialState()`.
- `app/page.tsx` subscribes to store changes and saves with a 300ms debounce (`saveState`).
- The app always renders through `app/layout/AppShell.tsx`.

## 2. First-run and project creation paths
- First run is `projects.length === 0`.
- Default first-run route is `OnboardingView`.
- Exception: if `ui.activeView === "brainstorm"`, `AppShell` renders `BrainstormView` even on first run.
- Onboarding uses `CreateProjectForm` (`app/views/settings/CreateProjectForm.tsx`) with two paths:
- Manual setup: validates required name + goal, clamps budget to 15-720, creates project, sets selected project, routes to Plan.
- AI-assisted (`Go to drawing board`): sets view to `brainstorm` and focuses brainstorm input.

## 3. Brainstorm (Drawing Board) and promotion
- Brainstorm UI is `app/views/BrainstormView.tsx`, state orchestration is `app/hooks/useBrainstorm.ts`.
- Each submit posts to `POST /api/ai/brainstorm` with message history and optional current draft.
- Response updates include:
- `message` (assistant text)
- `options` (suggested quick replies, up to 3)
- `updatedDraft` (patch-style draft updates)
- Suggestion-chip behavior: clicking an assistant option directly submits that text via `submitBrainstormMessage` (no extra Send click).
- Draft promotion (`promoteDraftToProject` in `lib/store.ts`):
- Creates a project from draft name/goal
- Sets default daily budget to 60
- Stores draft constraints in `focusNotes` (newline-joined)
- Creates milestones from draft
- Clears brainstorm state and routes to Plan
- If Azure AI config is missing, brainstorm route returns an offline message and preserves draft continuity.

## 4. Project context and milestone management
- Left sidebar (`app/layout/LeftSidebar.tsx`) controls active project context and milestone operations.
- Sidebar supports:
- Selecting active project
- Viewing project goal + computed progress
- Manual milestone create + complete toggle
- AI milestone proposal (`useAiGeneration().handleProposeMilestones`)
- Milestone click in sidebar dispatches `planning-milestone-select` to Plan.

## 5. Daily plan lifecycle
- Plan screen is `app/views/plan/index.tsx`.
- Active plan key is `(projectId, selectedDate)`.
- Milestone scope key is per-project (`ui.planMilestoneByProject[projectId]`), not per-date.
- If a selected milestone is deleted, Plan auto-resets that project's scope to `Whole Project` (`""`).
- Daily plans are created lazily when needed:
- adding tasks (`attachTasksToPlan`)
- saving budget override (`upsertDailyPlan`)
- AI generation preflight (`ensurePlan` in view/hook)
- Plan stores task IDs and optional `timeBudgetOverrideMinutes`.

## 6. Task creation, editing, and focus
- Manual tasks are created in `ManualTaskForm` and attached to the active plan.
- Task cards (`app/components/TaskCard.tsx`) support:
- inline title/description edits
- estimate edits
- done/todo toggle
- remove task
- pin/unpin (AI tasks only)
- send-to-focus action
- Focus view (`app/views/FocusView.tsx`) reads `ui.focusTaskId`, allows start/done, and clear focus.
- Status changes create both `progressEntries` and `activities` (`updateTaskStatus` in `lib/store.ts`).

## 7. AI task generation and regenerate behavior
- Client orchestration lives in `app/hooks/useAiGeneration.ts`.
- Generate request goes to `POST /api/ai/generate-tasks` with goal, project name, selected milestone title (optional), full milestone list, constraints, time budget, and notes.
- Milestone gating:
- If project has no milestones, Plan shows a prompt to add/propose milestones or continue with Whole Project.
- Regeneration logic is scope-aware (selected milestone or whole project):
- preserves pinned AI tasks
- replaces only unpinned tasks when needed
- supports append when budget allows
- shows prompt when budget is full (`aiPrompt` modes: `regenerate` / `budgetFull`)
- Backend validation/fallback (`app/api/ai/generate-tasks/route.ts`):
- validates input/output with Zod
- uses Azure Responses API when configured
- falls back to safe stub tasks when unavailable/invalid
- filters tasks that mention other milestones and can return `scopeWarning.filteredCount`

## 8. Budget behavior
- Budget source: plan override if present, otherwise project default.
- Budget UI (`BudgetBar`) supports same-day override edit/reset.
- Over-budget state is computed from total planned estimate vs active budget.
- Regeneration flow can open budget override when no append/replace room exists.

## 9. Activity, history, and date behavior
- Right sidebar (`RightSidebar`) shows Activity for selected project.
- Activity toggle:
- `Today` = selected-date scoped via `selectScopedActivities`
- `All` = full project activity log
- History view (`HistoryView`) shows:
- per-project done/total stats from current tasks
- last 10-day completion chart based on `completedAt`

## 10. Voice transcription flows
- Voice provider: `app/hooks/useVoiceRecording.tsx`.
- Header global record action:
- records audio
- posts multipart form data to `POST /api/voice/transcribe`
- emits `global-transcript` and supports `Add to plan notes` via `apply-plan-notes`
- Field-level dictation exists for brainstorm input, new milestone title, manual task title, and plan notes.
- Voice API route (`app/api/voice/transcribe/route.ts`):
- forwards multipart requests to Azure when configured
- returns configuration fallback transcript when Azure credentials are missing

## 11. Persistence and storage details
- Persistence implementation: `lib/storage.ts`.
- Primary storage: IndexedDB (`idb`), fallback: localStorage.
- State migration: legacy daily plan field `timeBudgetMinutes` is normalized to `timeBudgetOverrideMinutes` on load.
- All persistence is browser-local.

## 12. Settings project switching and creation
- Settings view (`app/views/settings/index.tsx`) shows `CreateProjectForm` whenever no project is selected.
- `Start New Project` clears `ui.selectedProjectId`, immediately exposing the creation form even when other projects already exist.
