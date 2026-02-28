# Testing Issues

Last updated: 2026-02-27
Scope: Playwright MCP end-to-end regression after fixes + targeted code review.

## Status
- The previously confirmed navigation-flow blockers were re-tested and are now resolved.
- Remaining items below are still open and require dedicated follow-up.

## Priority legend
- P0: blocks core flow
- P1: major functional risk
- P2: notable UX/behavior inconsistency
- P3: maintainability/polish risk

## Open items

1. P2 - Deleting milestones can orphan existing task milestone references
- Impact: Existing AI tasks can lose readable milestone labels and show generic grouping.
- Evidence: `deleteMilestone` removes milestone only (`lib/store.ts`), while tasks keep `milestoneId`; batch labeling falls back to `"Milestone"` when title is missing (`lib/selectors.ts` -> `selectAiBatchMeta`).
- Validation: Generate milestone-scoped tasks, delete that milestone, then inspect Plan labels and regenerate behavior.

2. P2 - AI milestone proposal may create duplicates
- Impact: Repeated `AI Propose` actions can clutter milestone lists with near-duplicate entries.
- Evidence: `handleProposeMilestones` appends all generated milestones with no dedupe check (`app/hooks/useAiGeneration.ts`).
- Validation: Trigger AI milestone proposal multiple times on the same project and inspect milestone list quality.

3. P3 - `ai-prompts/*` assets are not wired into runtime routes
- Impact: Prompt edits in these files may drift from actual behavior if contributors assume runtime usage.
- Evidence: no runtime imports for `ai-prompts/*`; prompts are inlined in `app/api/ai/*` and `app/api/voice/transcribe/route.ts`.
- Validation: Keep verifying with `rg -n "ai-prompts" app lib` whenever prompt work is proposed.

4. P1 - Production build currently fails under Next.js worker execution
- Impact: `npm run build` cannot complete, blocking production validation in this environment.
- Evidence: `next build` fails with `TypeError: process.chdir() is not supported in workers` from `next.config.compiled.js:17`.
- Validation: Re-run `npm run build` after adjusting/removing the worker-incompatible `process.chdir()` call path in Next config.

## Resolved on 2026-02-25 (verified)

1. P1 - `Start New Project` had no creation path when projects already existed
- Fix: Settings now renders `CreateProjectForm` whenever no project is selected.
- Verification: Click `Start New Project` in Settings with an existing project; create form appears.

2. P1 - Plan milestone scope reset to `Whole Project` after leaving Plan view
- Fix: Added persisted per-project milestone scope in store (`ui.planMilestoneByProject`) and wired Plan to use it.
- Verification: Select milestone scope, navigate to History, return to Plan; scope remains selected.

3. P1 - Fresh-start `Go to drawing board` failed to enter brainstorm flow
- Fix: App shell now renders Brainstorm on first-run when `ui.activeView === "brainstorm"`.
- Verification: In clean first-visit state, click `Go to drawing board`; Drawing Board loads.

4. P2 - Brainstorm suggestion chips required manual Send in some runs
- Fix: Suggestion chips now submit directly via hook (`submitBrainstormMessage`) instead of synthetic form submit.
- Verification: Clicking a suggestion posts user message and receives assistant reply immediately.

5. P1 - Settings could persist invalid daily budget values (e.g., `0`)
- Fix: Settings save now clamps budget to `15-720` before persisting and syncs draft value to the clamped result (`app/hooks/useProjectDrafts.ts`).
- Verification: Save `0` (or `9999`) in Settings; re-open project and confirm stored budget is clamped and generation endpoints receive a valid positive budget.

6. P1 - Budget-full regenerate path could show a dead-end replacement prompt
- Fix: AI generation now classifies no-append/no-replace states as `budgetFull`, and prompt UI consistently shows budget guidance instead of replacement actions (`app/hooks/useAiGeneration.ts`, `app/views/plan/MilestoneSelector.tsx`).
- Verification: Fill budget, pick a milestone scope with no replacement room, click Generate, and confirm `Adjust today's time` appears without a disabled replace-only prompt.
