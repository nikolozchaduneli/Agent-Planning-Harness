# App Flow

This document explains how the Task Centric Planner works end-to-end based on current code.

## 1. Project Creation
- User creates a project with:
  - Name
  - Goal
  - Daily time budget (minutes)
  - Optional focus notes
- Project is stored in local state and persisted to IndexedDB (with localStorage fallback).
- The user can choose:
  - Manual setup (default)
  - AI-assisted setup via Drawing Board (Brainstorm)
- Brainstorm promotion currently defaults the daily time budget to 60 minutes and uses brainstorm constraints as focus notes.

## 2. Brainstorm (Drawing Board)
- User chats with the AI to define project name, goal, and milestones.
- The brainstorm endpoint returns:
  - A reply message
  - Up to 3 suggested option buttons
  - A partial draft update
- When the AI marks the draft as ready, the user can click "Initialize Project" to create the project and milestones.

## 3. Daily Plan Setup
- User selects a date and a project.
- The app creates a daily plan lazily when tasks or a budget override are added for that project/date.
- The plan tracks:
  - Project
  - Date
  - Task IDs
  - Optional time budget override for that date

## 4. Task Generation (AI)
- User clicks "Generate Tasks" from Plan.
- Frontend calls `POST /api/ai/generate-tasks` with:
  - Project goal + name
  - Milestone context (if selected)
  - Daily time budget
  - Optional notes
  - Optional focus notes
- Backend:
  - Calls Azure OpenAI (if configured)
  - Enforces structured JSON response via schema validation (Zod)
  - Falls back to safe stub tasks if invalid or unavailable
  - Filters tasks that match other milestones and can return a scope warning
- Frontend:
  - Converts tasks into app `Task` objects
  - Attaches them to the daily plan
  - Updates UI immediately

## 5. Task Regeneration Behavior
- Pinned tasks are expected to remain across regenerate.
- Unpinned AI tasks in the selected milestone scope can be replaced.
- If the budget is full, the UI prompts for replace/adjust actions.
- If pinned tasks fully consume the budget, the UI shows a budget warning message.

## 6. Manual Tasks
- User can add manual tasks with an estimate.
- Tasks are attached to the active plan and persisted locally.
- Manual tasks can be scoped to a selected milestone.

## 7. Focus Mode
- User selects a task for focus.
- Focus view shows a single task with:
  - Title
  - Description
  - Estimate + status controls
- Status updates log a progress entry and an activity item.

## 8. History + Activity
- History view shows completion stats per project and last 10 days with completed tasks (from task completion timestamps).
- Activity entries come from explicit store actions (task status changes, milestone actions), not from task completion timestamps.
- Right sidebar Activity panel can show:
  - Today (selected date)
  - All (full project activity)

## 9. Voice Transcription (Azure)
- User records audio from the header button.
- Frontend uploads `multipart/form-data` to `POST /api/voice/transcribe`.
- The request includes:
  - `file` (audio)
  - `model` (e.g., `gpt-4o-mini-transcribe`)
  - `prompt` built from the selected project's name + goal
- Backend forwards the request to Azure and returns the transcript.
- Transcript can be appended to plan notes.

## 10. Persistence
- All state is saved after changes using:
  - IndexedDB (`idb`), primary
  - localStorage fallback
- Data stays local to the browser.
