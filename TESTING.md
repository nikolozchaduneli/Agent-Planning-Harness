# Testing Guide (New User Lens)

Use this as a short checklist to evaluate the app like a first‑time user. Do not assume how it is supposed to work; follow what feels intuitive. If something is confusing, non‑obvious, or surprising, call it out.


## Environment Rules (Must Follow)

1. Do not install dependencies or tools (no npm installs, no playwright install).
2. Do not modify `package.json`, `package-lock.json`, or any repo files as part of testing.
3. Assume the dev server is already running on `http://localhost:3000` unless explicitly told otherwise.
4. Use the MCP Playwright browser only; do not spawn separate Playwright installs or download browsers.

## Core Flow

1. Open the app in a clean browser profile (no saved state).
2. Try the obvious first step on the landing screen.
3. Create a project and confirm you land in the main planner.
4. Try adding a milestone and a task using the most discoverable controls.
5. Generate AI tasks, then pin 1-2 tasks and regenerate unpinned to confirm pinned tasks persist.
6. If budget allows, try "Append new batch" and confirm totals stay within budget.
7. Mark a task done and verify progress feedback.
8. Navigate to other tabs (drawing board, focus, history, settings) and note if they are discoverable and useful without explanation.

## Milestone Coherence Checks

1. Create at least 2 milestones (e.g., Alpha, Beta) with clearly different scope.
2. Select Milestone Alpha in the “Target Milestone” dropdown.
3. Generate AI tasks and verify:
   - The AI batch header shows “AI tasks — Milestone Alpha”.
   - Tasks are narrowly scoped to Alpha and do not drift into Beta’s scope.
   - Task granularity stays consistent with the milestone (no overly broad, project-wide tasks).
4. Repeat for Milestone Beta and compare overlap across both sets.
5. If you see scope leakage or mismatched granularity, log it in `TESTING_ISSUES.md` and take a screenshot.
6. If the milestone context is ignored, note whether “AI uses: <milestone>” displayed correctly at the time.

## Pin/Regenerate Coherence Checks

1. Pin 1-3 tasks in the active milestone batch.
2. Regenerate unpinned and confirm:
   - Pinned tasks remain intact and stay under the same milestone batch header.
   - Only unpinned tasks are replaced.
   - The remaining budget shown in the modal is accurate and matches planned totals after regen.
3. Try “Append new batch” when budget allows and confirm it appends a new batch for the same milestone (not a different one).
4. If budget is full, “Append new batch” must be disabled and show 0 remaining.

## UI/UX Checks

1. Is the primary action obvious on each screen?
2. Do labels and controls read clearly at a glance?
3. Are related controls grouped and aligned?
4. Does spacing feel balanced (no awkward empty zones or cramped sections)?
5. Is it clear what is clickable vs static?

## Functional Checks

1. Required fields behave as expected.
2. Data persists after refresh (or clearly resets, if intended).
3. Date changes isolate tasks correctly (if dates are used).
4. Actions produce immediate, visible feedback.
5. AI regeneration respects remaining budget (append should disable when budget is full).
6. Activity Trail toggles between Today and All without losing entries.

## Screenshot Policy

Take a screenshot only after consequential UI changes, not after every click.
If you notice a UI problem, a screenshot is mandatory. Capture the state that best illustrates the issue.

Examples of consequential changes:
- Moving from landing to planner
- Adding or removing a milestone/task
- Switching tabs when content changes
- Triggering or completing a major action (e.g., generate tasks, focus mode)

Avoid screenshots for minor focus states, hover states, or empty clicks.
