# Testing Issues (New User Lens)

Date: 2026-02-22
Scope: Playwright MCP manual flow

## Priority Legend
P0 = blocks core flow
P1 = major confusion / likely to cause user error
P2 = noticeable friction / polish
P3 = minor polish

## Priorities
1. P1 - Alpha-scoped AI task batch includes Beta-scoped tasks
2. P1 - Budget gate blocks milestone generation with misleading "pinned" copy
3. P1 - AI task generation appends without grouping or replace/confirm
4. P1 - "Clear focus" does not clear; it switches to another in-progress task
5. P1 - Milestone input requires Enter with no visible affordance

## Issues

1. P1 - Milestone input requires Enter with no visible affordance
   Impact: New users may type a milestone and not know how to add it.
   Evidence: Sidebar milestone input has no visible add button; Enter works but is not signposted.
   Suggested fix: Add a visible "Add" button or inline helper text (e.g., "Press Enter to add").

2. P2 - Two milestone entry points can feel redundant
   Impact: Users may be unsure where to add milestones (sidebar input vs plan "Add milestone").
   Evidence: Sidebar has "New milestone..." input while plan area also offers "Add milestone".
   Suggested fix: Consolidate to one primary entry point or explain the difference.

3. P2 - Activity Trail appears global, not date-scoped
   Impact: When date changes to 2026-02-23, the trail still shows 2026-02-22 events; may confuse users expecting date-specific history.
   Evidence: After switching the date, Activity Trail still lists the previous day's events.
   Suggested fix: Filter the trail by selected date or label it clearly as "All activity".

4. P1 - AI task generation appends without grouping or replace/confirm
   Impact: Running AI tasks for a different milestone produces a second task set with no separator or milestone label; list becomes long and confusing.
   Evidence: After selecting "Approved one-page sitemap and wireframes" and clicking "Generate tasks (AI)", the new tasks appended after existing AI tasks with no grouping or duplicate/replace prompt.
   Suggested fix: Add a confirm modal (append vs replace), or group tasks by milestone with clear headings.

5. P1 - "Clear focus" does not clear; it switches to another in-progress task
   Impact: Users may expect Focus to reset/empty, but it instead jumps to another task (if any are in "doing"), which feels like it ignored the action.
   Evidence: In Focus view after marking a task done, clicking "Clear focus" moved focus to another task already in "doing".
   Suggested fix: Either actually clear the focus (empty state) or rename the action to "Switch to active task" / explain behavior.

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

18. P1 - Budget gate blocks milestone generation with misleading "pinned" copy
   Impact: Users are blocked from generating the next milestone even when nothing is pinned; the message suggests pinned tasks are the cause.
   Evidence: After generating M1 tasks, selecting M2 and clicking "Generate tasks (AI)" showed "Pinned tasks already fill today's budget" despite no pinned tasks.
   Suggested fix: Separate milestone generation from daily budget, or update the message to reflect actual blocking reason and offer replace/append options.
