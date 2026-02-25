# Task Centric Planner - AGENTS

## Mission
- Keep this app reliable as a local-first daily planner that can use AI but never depends on it.
- Keep this file limited to always-relevant guidance; push task-specific detail into linked docs.

## WHAT (Stack + Ownership)
- Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Zustand, Zod.
- Data model: browser-local persistence only (`IndexedDB` primary, `localStorage` fallback).
- `lib/store.ts`: authoritative state mutations/actions.
- `lib/selectors.ts`: derived reads.
- `lib/types.ts`: domain types.
- `lib/storage.ts`: persistence + normalization.
- `app/page.tsx`: hydration + persistence wiring and global persistence subscription.
- `app/layout/AppShell.tsx`: app shell and view switching.
- `app/views/*`: user-facing flows (`Onboarding`, `Plan`, `Focus`, `History`, `Brainstorm`, `Settings`).
- `app/views/plan/index.tsx`: daily plan orchestration.
- `app/hooks/*`: client orchestration for AI generation, brainstorm, budget display, drafts, voice, sticky regen.
- `app/api/ai/*`: AI task/milestone/brainstorm routes.
- `app/api/voice/transcribe/route.ts`: voice transcription proxy.
- `ai-prompts/*`: prompt assets (currently not wired into runtime routes).

## WHY (Product Invariants)
- Local-only product: do not introduce backend persistence unless explicitly requested.
- AI is optional: when Azure credentials are missing, endpoints must return safe fallback behavior.
- Daily plan scope is `projectId + YYYY-MM-DD` and owns that day's task references.
- Plan milestone scope is persisted per project in `ui.planMilestoneByProject` and should survive view switches.
- Task generation must respect milestone scope and total time budget.
- Regeneration must preserve pinned tasks; only unpinned AI tasks are replaceable.

## HOW (Work In This Repo)
- Install: `npm install`
- Dev server: `npm run dev` (uses `scripts/dev.js`)
- Lint: `npm run lint`
- Build: `npm run build`
- Production run: `npm run start`
- When changing state behavior, keep `lib/store.ts`, `lib/types.ts`, `lib/selectors.ts`, and `lib/storage.ts` consistent.
- When changing AI flows, update both client orchestration and matching API route logic.
- When product behavior changes, update relevant docs (`FLOW.md`, `NAVIGATION.md`, `TESTING_ISSUES.md`).

## Verification Expectations
- Minimum for code changes: run `npm run lint`.
- For behavior changes in planning/AI/history/voice flows, run relevant sections in `TESTING.md`.
- Record newly found issues in `TESTING_ISSUES.md` with date, impact, evidence, and suggested fix.

## Environment Variables
- AI routes: `AZURE_OPENAI_ENDPOINT` or `AZURE_OPENAI_RESPONSES_URL`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_API_VERSION`
- Voice route: `AZURE_VOICE_ENDPOINT`, `AZURE_VOICE_API_KEY`, `AZURE_VOICE_DEPLOYMENT`, `AZURE_VOICE_API_VERSION`

## Progressive Disclosure (Read Only When Relevant)
- `flows/README.md`: canonical flow index (one markdown per typical user flow).
- `FLOW.md`: end-to-end product behavior and edge-case flow notes.
- `NAVIGATION.md`: quick codebase wayfinding by view/system.
- `TESTING.md`: manual QA procedure and constraints.
- `TESTING_ISSUES.md`: known defects and revalidation status.
- `scripts/mcp-pointer-compact.ps1`: compact pointer-state extraction for MCP pointer workflows.

## Documentation Freshness
- `FLOW.md`, `NAVIGATION.md`, `TESTING.md`, and `TESTING_ISSUES.md` may lag implementation.
- If docs and code conflict, treat current code as source of truth (`lib/store.ts`, `lib/selectors.ts`, `app/views/*`, `app/api/*`) and then update docs.
- Do not rely on a stale testing checklist alone for behavior verification; validate against the current UI/API flow.

## Maintenance Rule For This File
- Keep this file short, high-signal, and globally applicable.
- Prefer pointers to source docs over embedding long process detail.
- Update this file when core architecture, invariants, or command workflow changes.
