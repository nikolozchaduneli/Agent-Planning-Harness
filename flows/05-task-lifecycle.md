# Flow 05 - Task Lifecycle

## Purpose
Define task behavior from creation through focus and completion logging.

## Entry Points
- Plan view manual task form
- Plan `Generate Tasks`
- Task card actions

## Preconditions
- Active project and selected date

## Steps
1. Add a manual task in Plan.
2. Verify task card appears and planned minutes update.
3. Edit title/description/estimate inline.
4. Use `Send to Focus`, then confirm Focus view shows same task.
5. Mark done from Focus or task card.
6. Optionally pin AI task and regenerate tasks.

## Expected Outcomes
- Daily plan task references update correctly.
- Budget/planned totals react to estimate changes.
- Focus is tied to `ui.focusTaskId`.
- Completion writes progress + activity entries.
- Pinned AI tasks survive regenerate; unpinned AI tasks are replaceable.

## Key Code
- `app/views/plan/ManualTaskForm.tsx`
- `app/components/TaskCard.tsx`
- `app/views/FocusView.tsx`
- `app/hooks/useAiGeneration.ts`
- `lib/store.ts`
