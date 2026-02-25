# Core Flows

Last updated: 2026-02-25

This folder is the canonical flow map for end-to-end behavior.
Each file defines one typical user flow with preconditions, steps, and expected outcomes.

## Flow Index
- `flows/01-first-visit-onboarding.md`: first-run onboarding entry points and routing.
- `flows/02-brainstorm-to-project.md`: Drawing Board conversation to project initialization.
- `flows/03-manual-project-to-plan.md`: manual project creation and first plan state.
- `flows/04-milestone-lifecycle.md`: milestone create/select/rename/delete behavior.
- `flows/05-task-lifecycle.md`: manual/AI task creation through focus and completion.
- `flows/06-daily-execution-and-history.md`: date-scoped execution and history outcomes.
- `flows/07-settings-and-project-switching.md`: project edits, switching, and start-new-project.
- `flows/08-offline-and-fallbacks.md`: AI/voice behavior without Azure configuration.
- `flows/09-responsive-checkpoints.md`: minimum visual checks across desktop/mobile.

## Usage
- Product behavior review: start here, then open the specific flow file.
- Manual QA planning: use flow files to choose relevant test sections.
- Code changes: update affected flow files when user-visible behavior changes.
