# Testing Guide (New User Lens)

Use this as a short checklist to evaluate the app like a first-time user. Do not assume how it is supposed to work; follow what feels intuitive. If something is confusing, non-obvious, or surprising, call it out.

## Environment Rules (Must Follow)

1. Do not install dependencies or tools (no npm installs, no playwright install).
2. Do not modify `package.json`, `package-lock.json`, or any repo files as part of testing.
3. Assume the dev server is already running on `http://localhost:3000` unless explicitly told otherwise.
4. Use the MCP Playwright browser only; do not spawn separate Playwright installs or download browsers.

## Core Flow

1. Open the app in a clean browser profile (no saved state).
2. On first load, confirm the Create Project form is the obvious first step.
3. Create a project and confirm you land in the Plan view.
4. Add a milestone from the left sidebar and confirm it appears in the milestone dropdown.
5. Add a manual task with an estimate.
6. Generate AI tasks and confirm:
   - A new AI batch header appears.
   - Tasks match the selected milestone (or Whole Project).
7. Pin 1-2 AI tasks, regenerate, and confirm pinned tasks remain.
8. If budget allows, try regenerate append behavior; if budget is full, confirm the prompt appears.
9. Mark a task done and confirm it appears in Activity.
10. Navigate to Drawing Board, Focus, History, and Settings; confirm the nav is discoverable.

## Milestone Coherence Checks

1. Create at least 2 milestones (e.g., Alpha, Beta) with clearly different scope.
2. Select Milestone Alpha in the Target Milestone dropdown.
3. Generate AI tasks and verify:
   - The AI batch header shows the correct milestone label.
   - Tasks are scoped to Alpha and do not drift into Beta.
4. Repeat for Milestone Beta and compare overlap.
5. If you see scope leakage, log it in `TESTING_ISSUES.md` and take a screenshot.
6. If the milestone context seems ignored, verify the dropdown selection was correct.

## Pin/Regenerate Coherence Checks

1. Pin 1-3 AI tasks in the active milestone batch.
2. Regenerate and confirm:
   - Pinned tasks remain under the same batch header.
   - Only unpinned tasks are replaced.
3. If the budget is full, confirm:
   - The replace/adjust prompt appears.
   - "Adjust today's time" opens the budget override UI.
4. If pinned tasks fill the budget, confirm the warning message appears.

## UI/UX Checks

1. Is the primary action obvious on each screen?
2. Do labels and controls read clearly at a glance?
3. Are related controls grouped and aligned?
4. Does spacing feel balanced (no awkward empty zones or cramped sections)?
5. Is it clear what is clickable vs static?

## Functional Checks

1. Required fields behave as expected (name + goal are required).
2. Data persists after refresh.
3. Date changes isolate tasks correctly in Plan and Activity.
4. Actions produce immediate, visible feedback.
5. AI regeneration respects remaining budget (append should disable when budget is full).
6. Activity toggle switches between Today and All without losing entries.

## Voice Capture Checks (Optional)

1. Record a short note and confirm it transcribes.
2. Click "Add to plan notes" and confirm it appears in plan notes.

## Screenshot Policy

Take a screenshot only after consequential UI changes, not after every click.
If you notice a UI problem, a screenshot is mandatory. Capture the state that best illustrates the issue.

Examples of consequential changes:
- Moving from landing to planner
- Adding or removing a milestone/task
- Switching tabs when content changes
- Triggering or completing a major action (e.g., generate tasks, focus mode)

Avoid screenshots for minor focus states, hover states, or empty clicks.
