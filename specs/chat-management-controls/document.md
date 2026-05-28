# Chat management controls and file deletion

## Overview
Add stronger chat/session management affordances to the workspace so users can inspect a chat session id, rename or delete chats from a long-press gesture in the sidebar, and remove agent-created files directly from the editor pane.

## Goals
- Guarantee newly created backend session ids are exactly 20 digits.
- Surface the session id from the chat sidebar via a long-press interaction.
- Allow rename and delete actions from the same long-press affordance.
- Allow deletion of IndexedDB-backed files from the editor view.

## Scope / non-goals
- In scope: backend session id generation, chat metadata persistence, sidebar long-press UX, editor file deletion controls, toast feedback.
- Non-goals: server-side persistent chat storage, multi-select file deletion, changing the core agent loop protocol beyond session id shape.

## User flows / UX / design notes
- User long-presses a chat item in the sidebar.
- The pressed row expands into an action surface that shows the session id, rename action, and delete action.
- User can tap rename to edit the chat title inline and save immediately.
- User can tap delete to remove the chat.
- User opens a generated file in the editor and can remove it with a delete button from the editor tab/header.

## Functional requirements
- Backend `create_session()` must return a string containing exactly 20 numeric digits.
- Frontend should store the latest known backend `sessionId` on the related chat record so it can be shown later.
- Long-press must work on pointer/touch devices without breaking regular tap-to-open behavior.
- Sidebar action surface must expose session id, rename, and delete controls for the pressed chat.
- Rename must persist to IndexedDB and update the in-memory chat list immediately.
- File deletion must remove the record from IndexedDB, refresh the explorer, and clear selection if the deleted file was open.

## Data model / schema
- Extend `ChatSession` with optional `sessionId?: string`.
- IndexedDB `files` store remains keyed by normalized file path.
- Session ids are 20-digit strings.

## API contracts
- Existing SSE `session` event continues to emit `{ sessionId }`, now with a 20-digit string value.
- No new HTTP endpoints required.

## Edge cases / failure modes
- Long-press cancelled because the user scrolls or releases early.
- Rename submitted with blank text should fall back to the derived/default chat title.
- Deleting the active chat must clear active run state and visible transcript.
- Deleting the selected file must move selection to another file or empty state.

## Acceptance criteria
- Every newly started agent run produces a 20-digit session id.
- Long-pressing a chat reveals session id, rename, and delete actions.
- Renaming a chat persists after reload.
- Deleting a file removes it from the explorer and preview.

## Test plan / test cases
- Backend unit test validates session id length and numeric-only format.
- Frontend lint/build succeeds.
- Manual browser test validates long-press actions and file deletion behavior.

## Implementation notes
- Prefer cryptographically strong randomness for session ids where available.
- Keep long-press state local to the sidebar and dismiss it after action completion.
- Reuse existing toast patterns for rename/delete success feedback when useful.

## Status / open questions
- Status: done.
- Open question: session ids will only appear for chats created after this change unless older chats are updated by a new run.