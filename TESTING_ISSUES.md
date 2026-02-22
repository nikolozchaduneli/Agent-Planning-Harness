# Testing Issues (New User Lens)

Date: 2026-02-22
Scope: Playwright MCP manual flow

## Priority Legend
P0 = blocks core flow
P1 = major confusion / likely to cause user error
P2 = noticeable friction / polish
P3 = minor polish

## Priorities
1. P1 - Milestone-scoped AI tasks include out-of-scope milestone content without warning
2. P1 - Pinned tasks are not preserved on regenerate
3. P2 - Pinned-tasks helper text lacks strong visual cue

## Issues

1. P1 - Milestone-scoped AI tasks include out-of-scope milestone content without warning
   Impact: Users receive tasks from the wrong milestone, undermining trust in scoped generation.
   Evidence: Generating M1 tasks included analytics/reporting (M2) content with no scope warning shown.
   Suggested fix: Enforce milestone filter in generation or post-filter, and show a scope warning if any tasks were removed.

2. P1 - Pinned tasks are not preserved on regenerate
   Impact: Users lose intentionally pinned tasks when regenerating, contradicting the helper text and expected behavior.
   Evidence: After pinning 2 M2 tasks and clicking "Regenerate tasks (AI)", all tasks reverted to unpinned.
   Suggested fix: Preserve pinned tasks across regenerate; if pinned tasks are removed, show a clear warning and require confirmation.

3. P2 - Pinned-tasks helper text lacks strong visual cue
   Impact: Users miss the guidance that pinned tasks should be preserved, leading to confusion when regenerating.
   Evidence: Note “Pinned tasks are kept when regenerating.” is visually subtle and easy to overlook.
   Suggested fix: Add a stronger visual cue (icon, callout, or highlighted helper below the regenerate button).

4. P2 - Two milestone entry points can feel redundant
   Impact: Users may be unsure where to add milestones (sidebar input vs plan "Add milestone").
   Evidence: Sidebar has "New milestone..." input while plan area also offers "Add milestone".
   Suggested fix: Consolidate to one primary entry point or explain the difference.

5. P2 - Activity Trail appears global, not date-scoped
   Impact: When date changes to 2026-02-23, the trail still shows 2026-02-22 events; may confuse users expecting date-specific history.
   Evidence: After switching the date, Activity Trail still lists the previous day's events.
   Suggested fix: Filter the trail by selected date or label it clearly as "All activity".

6. P2 - Landing header feels like a stray label (tiny and top-left)
   Impact: First impression is weak; brand/context is unclear and the page feels unanchored.
   Evidence: Header "WELCOME TO TASK CENTRIC PLANNER" is small and pushed to extreme top-left.
   Suggested fix: Promote the header into a clear hero/title area with more visual weight and spacing.

7. P2 - Landing form card lacks page context
   Impact: The card floats without grounding, making the page feel empty and directionless.
   Evidence: No primary heading outside the form card; page looks unanchored.
   Suggested fix: Add a primary page heading + short intro outside the card.

8. P2 - "Existing projects" visually reads as CTA subheading
   Impact: Users may interpret the section as part of the CTA instead of a separate list.
   Evidence: The "Existing projects" section sits too close to the primary CTA with minimal separation.
   Suggested fix: Increase spacing/divider or give section its own block/heading styling.

9. P2 - Focus outline style is inconsistent and overly dominant
   Impact: The form feels inconsistent; focus on "Focus notes" looks like a warning and draws too much attention.
   Evidence: Strong orange outline on "Focus notes" versus subtler focus styles elsewhere.
   Suggested fix: Normalize focus styles across inputs and reduce outline intensity.

10. P2 - Time budget input looks like plain text (no minutes or spinner affordance)
    Impact: Users may not realize it's numeric or that arrows/scroll adjust minutes.
    Evidence: Time budget appears as a standard text field with no unit label.
    Suggested fix: Add "minutes" label, steppers, or visual affordance for numeric input.

11. P2 - Three-column layout feels imbalanced on desktop
    Impact: Center content feels cramped while both sidebars leave empty space.
    Evidence: Left sidebar + right Activity Trail on standard width narrows the main content.
    Suggested fix: Allow collapsing one sidebar by default, or use responsive reflow at common widths.

12. P2 - Top nav has low contrast and feels secondary
    Impact: Core navigation is easy to miss.
    Evidence: Small-caps nav labels are faint compared to primary CTA.
    Suggested fix: Increase contrast/size and emphasize active state.

13. P3 - Date pill lacks day context and edit affordance
    Impact: Users may not notice it's editable or what day it represents.
    Evidence: Date shows "02/22/2026" with tiny, subtle calendar icon.
    Suggested fix: Add day-of-week (e.g., "Sun") and/or clearer affordance.

14. P3 - Task input row feels visually noisy when typing
    Impact: The input reads like a warning state and is harder to scan.
    Evidence: Orange outline + mic icon + "25" chip creates a busy row with little spacing.
    Suggested fix: Reduce outline intensity and add spacing/grouping around icons/chip.

15. P1 - Newly added task card has low contrast and weak hierarchy
    Impact: It's easy to miss that a task was added; title doesn't pop.
    Evidence: Task card blends into background; "Manual task" label is tiny/uppercase.
    Suggested fix: Increase card contrast, strengthen title typography, and de-emphasize label.

16. P2 - "Focus" vs "Mark done" buttons are too similar
    Impact: Primary next action is unclear.
    Evidence: Buttons are small and visually similar on task cards.
    Suggested fix: Use stronger primary styling for "Focus" and secondary styling for "Mark done".

17. P1 - Alpha-scoped AI task batch includes Beta-scoped tasks
   Impact: Milestone-scoped generation violates scope separation; Alpha batches can introduce Beta work.
   Evidence: AI tasks — Milestone Alpha - Onboarding included "Generate Beta-only AI task set (control)" and "Run coherence QA: Beta task set" in the Alpha batch.
   Suggested fix: Enforce milestone filter before generation and/or post-filter outputs to remove cross-milestone tasks.

## Resolved (from 2026-02-22 run)
1. P1 - Milestone input requires Enter with no visible affordance
   Resolution: Visible "Add" button and helper text "Press Enter or click Add to create a milestone" now present.

2. P1 - "Clear focus" does not clear; it switches to another in-progress task
   Resolution: "Clear focus" now leaves empty state and does not auto-advance.

3. P1 - Budget gate blocks milestone generation with misleading "pinned" copy
   Resolution: Budget-full callout now reads "Today's budget is full" with options "Replace unpinned" and "Increase budget."

4. P1 - AI task generation appends without grouping or replace/confirm
   Resolution: AI task batches are grouped by milestone with clear headings and use replace flow when budget is full.
