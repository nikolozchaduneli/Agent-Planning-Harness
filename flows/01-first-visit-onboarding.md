# Flow 01 - First-Visit Onboarding

## Purpose
Define expected behavior when the app has no projects.

## Entry Points
- Fresh storage load at `http://localhost:3000`
- `Start New Project` from Settings (when no project is selected)

## Preconditions
- `projects.length === 0` or `ui.selectedProjectId` cleared into creation mode

## Steps
1. Open the app with no existing project selected.
2. Confirm Create Project form is shown (`OnboardingView` path).
3. Verify both entry choices are visible:
- `Use manual`
- `Go to drawing board`
4. Click `Go to drawing board` and confirm Drawing Board opens.
5. Click `Skip to manual setup` and confirm form returns.

## Expected Outcomes
- Onboarding appears without errors.
- AI-assisted path routes to Drawing Board on first visit.
- Manual setup route is reachable from both onboarding and drawing board.

## Key Code
- `app/layout/AppShell.tsx`
- `app/views/settings/CreateProjectForm.tsx`
- `app/views/BrainstormView.tsx`
