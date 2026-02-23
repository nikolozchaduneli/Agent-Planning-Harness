# Testing Issues (New User Lens)

Date: 2026-02-23
Scope: Code scan only (no fresh manual run)

## Status
- The issues below are derived from previous runs or code review and must be revalidated.
- Run the manual flow in `TESTING.md` to confirm current behavior before acting on any item.

## Priority Legend
P0 = blocks core flow
P1 = major confusion / likely to cause user error
P2 = noticeable friction / polish
P3 = minor polish

## Needs Revalidation (Carryover)

1. P1 - Milestone-scoped AI tasks include out-of-scope milestone content without warning
   Impact: Users receive tasks from the wrong milestone, undermining trust in scoped generation.
   Notes: Code now filters tasks mentioning other milestones and can show a scope warning. Verify in UI.

2. P1 - Pinned tasks are not preserved on regenerate
   Impact: Users lose intentionally pinned tasks when regenerating.
   Notes: Code now computes pinned vs unpinned and removes only unpinned in the active scope. Verify in UI.

3. P2 - Pinned-tasks helper text lacks strong visual cue
   Impact: Users miss that pinned tasks should be preserved.
   Notes: Helper still appears as small text under Generate Tasks. Verify if it is now clear enough.

4. P2 - Two milestone entry points can feel redundant
   Impact: Users may be unsure where to add milestones (sidebar input vs plan "Add milestone").
   Notes: Both entry points still exist. Confirm if this causes confusion.

5. P2 - Activity Trail appears global, not date-scoped
   Impact: Users may expect Activity to be date-scoped.
   Notes: Activity is scoped by selected date when "Today" is active. Verify the toggle behavior.

6. P2 - Landing header feels like a stray label (tiny and top-left)
   Impact: First impression is weak; brand/context is unclear.
   Notes: Header still shows a small welcome label during first run. Verify visually.

7. P2 - Landing form card lacks page context
   Impact: The card floats without grounding.
   Notes: Onboarding view still renders only Create Project card. Verify need for page-level hero.

8. P2 - "Existing projects" visually reads as CTA subheading
   Impact: Users may interpret the section as part of the CTA instead of a separate list.
   Notes: In Settings view, the Existing Projects section follows the settings form. Verify spacing.

9. P2 - Focus outline style is inconsistent and overly dominant
   Impact: The form feels inconsistent.
   Notes: Focus styles are defined in Tailwind; verify on inputs in Plan and Create Project.

10. P2 - Time budget input looks like plain text (no minutes or spinner affordance)
    Impact: Users may not realize it is numeric or that arrows/scroll adjust minutes.
    Notes: Some inputs now include a "minutes" label. Verify remaining instances.

11. P2 - Three-column layout feels imbalanced on desktop
    Impact: Center content feels cramped while both sidebars leave empty space.
    Notes: AppShell still renders both sidebars; verify layout balance.

12. P2 - Top nav has low contrast and feels secondary
    Impact: Core navigation is easy to miss.
    Notes: Active tab is accented; verify overall contrast.

13. P3 - Date pill lacks day context and edit affordance
    Impact: Users may not notice it is editable or what day it represents.
    Notes: Date is a native date input with a "Date" label; verify clarity.

14. P3 - Task input row feels visually noisy when typing
    Impact: The input reads like a warning state and is harder to scan.
    Notes: Inputs use accent focus ring; verify if still too loud.

15. P1 - Newly added task card has low contrast and weak hierarchy
    Impact: It's easy to miss that a task was added; title doesn't pop.
    Notes: TaskCard has stronger borders and title sizes; verify visually.

16. P2 - "Focus" vs "Mark done" buttons are too similar
    Impact: Primary next action is unclear.
    Notes: Focus button is accented; done is icon-only. Verify clarity.

17. P1 - Alpha-scoped AI task batch includes Beta-scoped tasks
    Impact: Scope separation breaks trust.
    Notes: Same as issue #1; verify after AI generation.

## Resolved (from 2026-02-22 run)
1. P1 - Milestone input requires Enter with no visible affordance
   Resolution: Visible "Add" button and helper text now present.

2. P1 - "Clear focus" does not clear; it switches to another in-progress task
   Resolution: "Clear focus" now leaves empty state and does not auto-advance.

3. P1 - Budget gate blocks milestone generation with misleading "pinned" copy
   Resolution: Budget-full callout now reads "Today's budget is full" with options "Replace unpinned" and "Increase budget."

4. P1 - AI task generation appends without grouping or replace/confirm
   Resolution: AI task batches are grouped by milestone with clear headings and use replace flow when budget is full.
