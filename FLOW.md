# App Flow

This document explains how the Task Centric Planner works end-to-end.

## 1. Project Creation
- User creates a project with:
  - Name
  - Goal
  - Daily time budget (minutes)
  - Optional focus notes
- Project is stored in the local state and persisted to IndexedDB (with localStorage fallback).

## 2. Daily Plan Setup
- User selects a date and a project.
- The app ensures a daily plan exists for that project/date.
- The plan tracks:
  - Project
  - Date
  - Task IDs
  - Daily time budget

## 3. Task Generation (AI)
- User clicks `Generate tasks`.
- Frontend calls `POST /api/ai/generate-tasks` with:
  - Project goal
  - Project constraints
  - Daily time budget
  - Optional notes
- Backend:
  - Calls Azure OpenAI (if configured)
  - Enforces structured JSON response via schema validation (Zod)
  - Falls back to safe stub tasks if invalid or unavailable
- Frontend:
  - Converts tasks into app `Task` objects
  - Attaches them to the daily plan
  - Updates UI immediately

## 4. Manual Tasks
- User can add manual tasks with an estimate.
- Tasks are appended to the plan and persisted locally.

## 5. Focus Mode
- User selects a task for focus.
- Focus view shows a single task with:
  - Title
  - Description
  - Estimate
  - Status actions (start, done)
- Status updates log a progress event.

## 6. Progress Tracking
- Every status change creates a progress entry.
- History view aggregates:
  - Completion stats per project
  - Last 10-day activity

## 7. Voice Transcription (Azure)
- User records audio from the header button.
- Frontend uploads `multipart/form-data` to `POST /api/voice/transcribe`.
- The request includes:
  - `file` (audio)
  - `model` (e.g., `gpt-4o-mini-transcribe`)
  - `prompt` built from the selected project's name + goal (to preserve domain terms).
- Backend forwards the request to Azure and returns the transcript.
- Transcript is shown in the header and can be inserted into Plan Notes.

## 8. Persistence
- All state is saved after changes using:
  - IndexedDB (`idb`), primary
  - localStorage fallback
- Data stays local to the browser.
