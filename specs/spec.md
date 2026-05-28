# Agent Workbench Specification

## Project overview
Agent Workbench is a production-grade browser-based AI coding workspace with a React + Vite frontend and a FastAPI backend. The product exposes a real ReAct agent loop backed by OpenRouter, streams responses token-by-token over SSE, and persists generated files in browser IndexedDB so the user can inspect and manage a local virtual filesystem without relying on server-side storage.

## Goals
- Deliver a real coding agent with native tool calling through OpenRouter.
- Support file creation, overwrite, and read operations against browser IndexedDB.
- Stream assistant output and tool activity in real time with a responsive professional UI.
- Keep frontend and backend separated, with backend URL configured from frontend environment variables.
- Make provider integrations extensible beyond OpenRouter.

## Design direction
- Dark, high-contrast black workspace with graphite surfaces, red accent highlights, and restrained glow.
- Desktop-first split layout that collapses cleanly to stacked panels on tablets and mobile.
- User messages appear in bubbles; assistant output renders as a clean transcript without bubbles.
- Tool activity appears inline as minimal chips in the transcript.
- Settings are accessible from the top bar and allow API key entry and model selection.

## Technical stack decisions
- Frontend: React 19, Vite, TypeScript, Tailwind CSS v4, Radix UI primitives, native EventSource-style stream consumption via `fetch` streaming, IndexedDB persistence.
- Backend: Python 3.12+, FastAPI, Pydantic, asyncio, uvicorn, httpx for OpenRouter HTTP access, SSE via `StreamingResponse`.
- Persistence: Browser IndexedDB for files, localStorage for UI settings, in-memory backend session registry for active streams.
- Model provider: OpenRouter first, with a provider abstraction to add future model vendors.
- Database provider choice: default provider reserved for future use; no active backend database in MVP because file storage lives in IndexedDB.

## Architecture rules
- Tool calls must be native LLM tool calls, never simulated in text.
- File tools must be registered in the LLM `tools` payload using the exact schemas requested.
- The backend orchestrates the ReAct loop and pauses when tools are requested.
- The frontend executes file tools against IndexedDB and posts tool results back to the backend.
- Every request resets the visible iteration counter, but the hard backend cap stays at 1000 iterations.
- All async flows must expose loading, error, and reconnect-safe states.
- Active agent runs must survive browser refreshes by resuming SSE delivery from a buffered backend session.

## Feature list
| Feature | Status | Spec |
| --- | --- | --- |
| ReAct agent loop with native tool calling | done | `specs/agent-loop/document.md` |
| OpenRouter settings and model catalog | done | `specs/openrouter-settings/document.md` |
| IndexedDB file storage bridge | done | `specs/indexeddb-file-storage/document.md` |
| Responsive workspace frontend | done | `specs/frontend-workspace/document.md` |
| Resumable stream sessions | in-progress | `specs/resumable-stream-sessions/document.md` |
| Chat management controls and file deletion | done | `specs/chat-management-controls/document.md` |
