# Flow 08 - Offline and Fallbacks

## Purpose
Define expected UX when Azure AI/voice configuration is unavailable.

## Entry Points
- AI task generation endpoint
- AI milestone proposal endpoint
- Brainstorm endpoint
- Voice transcription endpoint

## Preconditions
- Missing or invalid Azure environment variables

## Steps
1. Trigger Generate Tasks in Plan.
2. Trigger AI milestone proposal.
3. Send a brainstorm message.
4. Trigger voice transcription path (header or field-level).

## Expected Outcomes
- Task generation returns safe fallback tasks.
- Milestone generation returns fallback milestone suggestions.
- Brainstorm returns explicit offline-mode assistant messaging and keeps draft usable.
- Voice route returns a clear not-configured transcript response.

## Key Code
- `app/api/ai/generate-tasks/route.ts`
- `app/api/ai/generate-milestones/route.ts`
- `app/api/ai/brainstorm/route.ts`
- `app/api/voice/transcribe/route.ts`
