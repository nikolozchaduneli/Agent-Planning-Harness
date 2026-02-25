# Flow 06 - Daily Execution and History

## Purpose
Verify date-scoped planning and historical completion visibility.

## Entry Points
- Date picker in header
- Plan view and History view
- Activity rail (`Today` / `All`)

## Preconditions
- At least one project exists

## Steps
1. On Date A, add and complete tasks.
2. Switch to Date B and confirm Date A plan items are not shown.
3. Add task activity on Date B.
4. Toggle Activity rail between `Today` and `All`.
5. Open History view.

## Expected Outcomes
- Plan data is scoped by `(projectId, selectedDate)`.
- Activity `Today` filters by selected date.
- Activity `All` shows full project timeline.
- History shows aggregate completion and recent completion trend.

## Key Code
- `app/views/history/HistoryView.tsx`
- `app/layout/RightSidebar.tsx`
- `lib/selectors.ts`
- `lib/store.ts`
