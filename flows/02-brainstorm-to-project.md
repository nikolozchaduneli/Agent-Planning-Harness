# Flow 02 - Brainstorm to Project

## Purpose
Cover the AI-guided project design path from first prompt to project creation.

## Entry Points
- `Go to drawing board` from onboarding/create form
- `Drawing Board` tab when available

## Preconditions
- Brainstorm view rendered
- User can type or dictate into brainstorm input

## Steps
1. Enter a project pitch and submit.
2. Verify assistant response appears in thread.
3. If suggestion chips appear, click one and confirm it auto-submits (no extra Send click).
4. Verify `Live Canvas` updates draft fields (name/goal/constraints/milestones when available).
5. Continue until readiness action enables (`Initialize Project`/promotion action).
6. Promote draft into project.

## Expected Outcomes
- Conversation appends user + assistant turns.
- Suggestion chip click posts immediately.
- Draft data persists and updates incrementally.
- Promotion creates project, creates milestones from draft, routes to Plan.
- If AI config missing, offline assistant response still preserves draft continuity.

## Key Code
- `app/views/BrainstormView.tsx`
- `app/hooks/useBrainstorm.ts`
- `app/api/ai/brainstorm/route.ts`
- `lib/store.ts` (`promoteDraftToProject`)
