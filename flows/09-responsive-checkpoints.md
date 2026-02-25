# Flow 09 - Responsive Checkpoints

## Purpose
Set minimum visual checks for layout stability across key breakpoints.

## Entry Points
- Onboarding/Create Project
- Plan
- Drawing Board
- Focus
- Settings

## Preconditions
- Ability to test desktop and mobile viewport widths

## Steps
1. Desktop pass (>= 1280px): review core views for clipping, nested scrollbars, and hierarchy.
2. Tablet pass (~768px): verify nav controls remain reachable and form sections remain readable.
3. Mobile pass (~390px): verify top navigation, action buttons, and text fields remain usable.
4. In each viewport, perform one consequential action per view (create, add milestone, add task, navigate).

## Expected Outcomes
- No clipped primary navigation labels.
- No blocked primary action controls.
- No layout break that prevents completing core flows.
- Any visual defects are logged in `UI_ISSUES.md` with screenshot evidence.

## Key Code
- `app/layout/AppShell.tsx`
- `app/layout/LeftSidebar.tsx`
- `app/layout/RightSidebar.tsx`
- `app/views/*`
