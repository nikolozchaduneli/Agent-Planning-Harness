# Testing Guide

Last updated: 2026-02-25
Scope: Manual QA checklist aligned to current UI and code behavior.

## Flow Docs
- Canonical flow definitions are in `flows/` (start with `flows/README.md`).
- Use flow files to choose which checklist sections to run for a given change.

## Environment rules
1. Assume dev server is available at `http://localhost:3000`.
2. Do not install extra tools as part of this checklist.
3. Do not modify repo files while running manual tests.
4. Record screenshots only for consequential state changes or defects.

## 1. Smoke flow
1. Open in a clean profile/storage state.
2. Confirm first screen is project creation (`OnboardingView`) and `Go to drawing board` is visible.
3. Click `Go to drawing board` and confirm Drawing Board opens (still in first-visit state with no project).
4. Return to manual setup and create a project; confirm app routes to Plan.
5. Verify left sidebar shows selected project and milestones panel.
6. Add one milestone in sidebar and confirm it appears in Plan milestone selector.
7. Add one manual task and confirm task card appears in Plan.
8. Send task to Focus and confirm Focus view shows the same task.
9. Mark task done and confirm Activity receives an entry.
10. Visit History and Settings, then return to Plan.

## 2. Brainstorm path
1. From onboarding or header nav, open Drawing Board.
2. Send at least 2 brainstorm turns.
3. Confirm assistant messages appear with suggestion options when provided.
4. Click one suggestion chip and confirm it posts immediately (no extra Send click).
5. Confirm Live Canvas updates draft fields (name/goal/milestones/constraints).
6. If `Initialize Project` becomes enabled, click it and confirm:
- project is created
- milestones are created
- app routes to Plan

## 3. Milestone + generation behavior
1. In a project with at least 2 distinct milestones, select Milestone A in Plan.
2. Generate tasks and confirm AI batch header matches Milestone A.
3. Switch to Milestone B and generate again; confirm header and task scope are B-oriented.
4. Confirm `scopeWarning` appears when off-scope tasks are filtered.
5. In a project with zero milestones, click Generate and verify prompt options:
- Add milestone
- AI propose milestones
- Continue with Whole Project

## 4. Regenerate and budget matrix
1. Pin 1-2 AI tasks in selected scope.
2. Trigger Generate again and verify unpinned replacement prompt appears when applicable.
3. Use `Replace Unpinned Tasks` and confirm pinned tasks persist.
4. Fill/overfill budget and verify:
- budget bar and over-budget message update
- budget-full prompt appears when append is impossible
- `Adjust today's time` opens override controls
5. If pinned scoped tasks consume full budget, verify pinned-budget warning message appears.

## 5. Manual task and task-card controls
1. Add manual task with dictation mic and verify transcript fills title.
2. Edit task title and description inline.
3. Change estimate and verify budget totals update immediately.
4. Remove a task and confirm it disappears and no longer counts in plan totals.
5. Toggle done/todo and verify activity log entries update.

## 6. Voice capture checks
1. Use header `Record` button and stop recording.
2. Confirm transcript result appears and `Add to plan notes` button is shown.
3. Click `Add to plan notes` and confirm notes append in Plan view.
4. Verify field-level dictation works for:
- brainstorm input
- new milestone input
- manual task title
- plan notes textarea

## 7. Date, persistence, and activity
1. Add tasks on Date A, switch to Date B, confirm plan task list is isolated by date.
2. Return to Date A and verify tasks are still present.
3. In right sidebar Activity:
- `Today` should filter by selected date
- `All` should show full project activity
4. Refresh browser and verify state persists (projects/tasks/plans/milestones/activities).

## 8. Settings checks
1. Open Settings and edit project fields (name, goal, budget, focus notes).
2. Verify Save/Cancel and dirty-state behavior works.
3. Reorder, rename, and delete milestones in editable list.
4. Switch active project from `Existing projects` and verify context updates app-wide.
5. Click `Start New Project` and confirm `CreateProjectForm` appears immediately (even when projects already exist).

## 9. Multi-project regression checks
1. Create Project A and Project B.
2. Select a milestone in Project A Plan.
3. Navigate `Plan -> History -> Plan` in Project A and confirm the same milestone remains selected.
4. Switch to Project B and confirm milestone target is valid for B (or reset to Whole Project).
5. Generate tasks in Project B and verify tasks are attached only to Project B + selected date.

## 10. Offline / fallback checks (optional but recommended)
1. With AI env vars absent, verify:
- generate tasks returns safe fallback tasks
- generate milestones returns fallback milestones
- brainstorm returns offline-mode assistant message
2. With voice env vars absent, verify voice route returns a clear not-configured transcript message.
