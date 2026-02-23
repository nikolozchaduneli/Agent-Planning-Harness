# Task Centric Planner

Web MVP for project-based daily planning with AI-suggested tasks, timeboxing, and progress history. Data is stored locally in the browser.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment variables (optional)

These enable Azure OpenAI structured task generation via the Responses API. Without them, the API falls back to safe stub tasks.

```
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_RESPONSES_URL=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_DEPLOYMENT=
AZURE_OPENAI_API_VERSION=2024-10-21
```

Notes:
- Use `AZURE_OPENAI_ENDPOINT` for standard Azure OpenAI resources.
- If you prefer the Foundry-provided full Responses URL, set `AZURE_OPENAI_RESPONSES_URL` instead (it overrides the base endpoint).

Voice transcription proxies to Azure when configured and returns a stub transcript when it is not configured. You can wire your Azure voice endpoint here:

```
AZURE_VOICE_ENDPOINT=
AZURE_VOICE_API_KEY=
AZURE_VOICE_DEPLOYMENT=
AZURE_VOICE_API_VERSION=2025-03-01-preview
```

## Structure

- `app/page.tsx`: main UI
- `app/api/ai/generate-tasks`: AI task generation endpoint
- `app/api/voice/transcribe`: voice proxy endpoint (stub response when not configured)
- `lib/store.ts`: Zustand store and actions
- `lib/storage.ts`: IndexedDB + localStorage persistence
