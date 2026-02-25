# UI Issues

Visual audit run: 2026-02-25  
Artifacts: `docs/ui/` (curated), `output/playwright/` (transient local captures)

## Resolved In This Pass (2026-02-25)
- `UI-R01` Manual task `Add` button alignment in the central panel was inconsistent with adjacent controls.
- Status: Fixed
- Evidence: `docs/ui/ui-13-manual-task-added-after-surgical-fixes.png`
- Notes: Manual input, time control, and add action now share a consistent row rhythm on desktop, with mobile-safe stacking.

- `UI-R02` Scope label in manual task form was squeezed into the bottom-right corner and visually easy to miss.
- Status: Fixed
- Evidence: `docs/ui/ui-13-manual-task-added-after-surgical-fixes.png`
- Notes: Scope is now rendered as a dedicated line below the input row with stronger legibility.

## UI-001
- Severity: High
- Area: Global navigation (mobile)
- Issue: Top nav items overflow/truncate on small screens (`HISTORY` is clipped), which makes primary navigation unclear on first glance.
- Evidence: `docs/ui/ui-12-mobile-drawing-board.png`
- Repro:
1. Open the app on a mobile viewport (around 390x844).
2. Go to the Drawing Board view.
3. Observe the top nav labels at the right edge.
- Suggested fix: Replace the current fixed-width tab row with a mobile pattern (horizontal scroll with snap, condensed labels, or a menu button).

## UI-002
- Severity: Medium
- Area: Drawing Board conversation layout
- Issue: Large unused vertical space appears between the latest assistant message and the suggestion/input region, pushing key controls lower than needed.
- Evidence: `docs/ui/ui-11-drawing-board-suggestions.png`
- Repro:
1. Open Drawing Board.
2. Send an initial prompt.
3. Observe the large blank block in the main thread area.
- Suggested fix: Tighten the chat layout so suggestions/input stay closer to the latest message, and cap conversation region height with predictable overflow behavior.

## UI-003
- Severity: Medium
- Area: Settings -> Start New Project flow
- Issue: After `Start New Project`, the screen shows the create form but the nav still highlights `SETTINGS`, which creates a view-state mismatch.
- Evidence: `docs/ui/ui-10-start-new-project-form.png`
- Repro:
1. Create/select a project.
2. Open Settings.
3. Click `Start New Project`.
4. Observe that the create form appears while `SETTINGS` remains the active tab.
- Suggested fix: Move this state to a dedicated create/onboarding route or update active-nav logic to match the rendered view.

## UI-004
- Severity: Medium
- Area: App shell scrolling behavior (desktop)
- Issue: Multiple independent scroll containers are visible at once, producing competing scrollbars and reducing readability of long pages.
- Evidence: `docs/ui/ui-04-plan-initial.png`, `docs/ui/ui-10-start-new-project-form.png`
- Repro:
1. Open Plan or Create Project views on desktop.
2. Scroll the page and inspect the right-side gutters.
3. Observe concurrent scrollbars in the shell/content regions.
- Suggested fix: Consolidate to one primary vertical scroll container per layout mode and avoid nested `overflow-y-auto` regions unless intentional.

## UI-005
- Severity: Low
- Area: Activity rail empty state
- Issue: Empty Activity rail occupies persistent horizontal space even when it only shows a short placeholder, reducing room for core content.
- Evidence: `docs/ui/ui-04-plan-initial.png`, `docs/ui/ui-08-history-view.png`
- Repro:
1. Open the app with little/no activity data.
2. Navigate Plan or History.
3. Observe the right rail consuming width with minimal content.
- Suggested fix: Auto-collapse or shrink the rail in empty state, with a lightweight affordance to reopen it.
