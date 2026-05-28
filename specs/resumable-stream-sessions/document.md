# Resumable stream sessions

## Overview
Keep agent runs alive on the backend even when the browser refreshes or the frontend SSE connection drops. The frontend should reconnect automatically, continue rendering live updates, replay unresolved tool calls, and preserve the saved chat transcript.

## Goals
- Prevent browser refreshes from cancelling backend agent runs.
- Resume live streaming from the last processed SSE event.
- Keep pending browser-side tool calls recoverable after reconnect.
- Preserve transcript and chat selection across refreshes.

## Scope / non-goals
- In scope: backend in-memory run registry, resumable SSE endpoint, frontend reconnect state, transcript persistence updates.
- Non-goals: durable backend storage across server restarts, multi-device session sync, resumable provider-side HTTP streams after backend restart.

## User flows / UX / design notes
- User starts a chat and the assistant begins streaming.
- User refreshes the browser tab.
- The page reloads, restores the active chat transcript, reconnects to the active backend run, and continues showing live tokens/tool activity.
- If a tool call was pending at refresh time, the refreshed frontend receives it again and completes it.
- Finished chats remain in IndexedDB and can be reopened later.

## Functional requirements
- Starting a chat must create a backend run session that is independent from a single HTTP response lifecycle.
- Backend must buffer SSE events with ordered ids and allow clients to reconnect from a supplied `after` cursor.
- Backend must continue processing even if the original client disconnects.
- Backend must replay unresolved tool_call events on reconnect so browser-executed tools can finish.
- Frontend must persist active run metadata in localStorage.
- Frontend must reconnect automatically after refresh or transient disconnect.
- Frontend must keep chat messages persisted while streaming so refresh does not erase transcript state.

## Data model / schema
- `ActiveRunState`: sessionId, assistantId, chatId, lastEventId.
- `StreamEvent`: ordered id, event name, JSON payload.
- `AgentRunSession`: buffered events, unresolved tool calls, completion state.

## API contracts
- `POST /api/chat/stream`: starts a new backend-managed stream session.
- `GET /api/chat/stream/{session_id}?after=<event_id>`: resumes an existing stream from the last processed event id.
- `POST /api/chat/tool-result`: remains the browser tool callback endpoint.

## Edge cases / failure modes
- Browser refresh during a pending tool call.
- Connection drops after session creation but before completion.
- Client reconnects after a run already finished.
- Backend process restart removes in-memory run session.

## Acceptance criteria
- Refreshing the page during an active run does not stop the backend run.
- The refreshed UI resumes the same assistant message instead of starting over.
- Pending tool calls can complete after reconnect.
- Previously streamed chat content remains visible after refresh.

## Test plan / test cases
- Backend unit test for buffered session replay and unresolved tool replay.
- API integration test for resume endpoint.
- Frontend manual test: start a long response, refresh, verify continued streaming.
- Frontend manual test: verify chat transcript still exists after refresh and completion.

## Implementation notes
- Use in-memory buffering for the current process lifetime.
- Use SSE `id:` fields for incremental resume cursors.
- Treat browser-local chat persistence as the source of truth for visible transcript restoration.

## Status / open questions
- Status: in-progress.
- Open question: backend restart still loses active runs because the current design is intentionally in-memory only.