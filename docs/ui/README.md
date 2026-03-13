# UI Assets

Animated GIFs showcasing the three AI feature flows.
Re-record any time with the scripts in [`scripts/record-ui/`](../../scripts/record-ui/).

## AI feature GIFs

### `gif-01-drawing-board.gif` — Drawing Board (full flow)
Home → empty board → prompt typed → AI brainstorm rounds (thinking flash + canvas updating each round) → Initialize Project → Plan view lands.

### `gif-02-plan-tasks.gif` — Plan view: AI task generation
Milestone selected → Generate Tasks → skeleton loading → tasks appear with time estimates and budget bar.

### `gif-03-focus-prompt.gif` — Focus view: AI execution prompt
Tasks loaded in Plan → hover task card → Send to Focus → Focus view → Generate AI Prompt → generating → full prompt + Execution Checklist.

---

## Baseline UI screenshots

Older static captures kept for flow reference and issue evidence:

| File | What it shows |
|---|---|
| `ui-01-onboarding.png` | First-visit create-project view |
| `ui-02-drawing-board.png` | Drawing board baseline |
| `ui-04-plan-initial.png` | Plan view baseline |
| `ui-06-manual-task-added.png` | Manual task state (pre-polish) |
| `ui-08-history-view.png` | History view baseline |
| `ui-10-start-new-project-form.png` | Settings → start new project |
| `ui-11-drawing-board-suggestions.png` | Drawing board spacing issue evidence |
| `ui-12-mobile-drawing-board.png` | Mobile nav clipping evidence |
| `ui-13-manual-task-added-after-surgical-fixes.png` | Post-surgical-fix validation |

## Policy
- Keep only durable, high-signal assets here.
- Store transient run artifacts under `output/playwright/` (gitignored).
- To re-record GIFs: see [`scripts/record-ui/README.md`](../../scripts/record-ui/README.md).
