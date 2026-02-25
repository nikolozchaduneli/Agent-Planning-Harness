# Flow 03 - Manual Project to Plan

## Purpose
Define manual project creation and first successful route into planning.

## Entry Points
- Create Project form (`OnboardingView` or Settings create state)

## Preconditions
- User is on create form

## Steps
1. Fill required fields: project name and project goal.
2. Optionally adjust daily time and focus notes.
3. Submit `Create project`.
4. Confirm Plan view renders.
5. Confirm selected project context appears in left sidebar.

## Expected Outcomes
- Validation blocks submit when required fields are empty.
- Budget input is clamped to valid range.
- New project becomes selected project.
- Plan loads for selected date with project context and empty/initial task state.

## Key Code
- `app/views/settings/CreateProjectForm.tsx`
- `app/views/plan/index.tsx`
- `lib/store.ts`
