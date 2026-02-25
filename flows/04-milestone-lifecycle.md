# Flow 04 - Milestone Lifecycle

## Purpose
Define milestone operations and milestone-scope behavior in planning.

## Entry Points
- Left sidebar milestones section
- Plan milestone selector
- Settings milestone editor

## Preconditions
- Active project selected

## Steps
1. Add milestone from sidebar input.
2. Confirm milestone appears in sidebar and plan scope selector.
3. Select milestone in Plan and confirm target scope label updates.
4. Rename/reorder/delete milestone in Settings.
5. Return to Plan and verify selection remains valid.
6. If selected milestone is deleted, verify scope resets to `Whole Project`.

## Expected Outcomes
- Milestones are project-scoped.
- Selected plan milestone is stored per project.
- Deletion of selected milestone auto-resets invalid scope.
- Milestone selection survives view switches for same project.

## Key Code
- `app/layout/LeftSidebar.tsx`
- `app/views/plan/MilestoneSelector.tsx`
- `app/views/settings/index.tsx`
- `lib/store.ts` (`ui.planMilestoneByProject`)
