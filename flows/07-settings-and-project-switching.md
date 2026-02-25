# Flow 07 - Settings and Project Switching

## Purpose
Define stable behavior for project edits, switching, and creation reset.

## Entry Points
- Settings tab
- Existing projects list
- `Start New Project` action

## Preconditions
- At least one existing project for switching checks

## Steps
1. Open Settings and edit project fields.
2. Verify dirty state and Save/Cancel behavior.
3. Switch to another project from `Existing projects`.
4. Confirm context updates across Plan/History/Focus.
5. Click `Start New Project`.
6. Confirm `CreateProjectForm` appears immediately.

## Expected Outcomes
- Settings edits persist only on explicit save.
- Project switch changes active context app-wide.
- `Start New Project` clears current selection and shows creation form even with existing projects.

## Key Code
- `app/views/settings/index.tsx`
- `app/layout/LeftSidebar.tsx`
- `app/layout/AppShell.tsx`
- `lib/store.ts`
