# IndexedDB file storage bridge

## Overview
Implement a browser-side virtual filesystem stored in IndexedDB and expose operations that satisfy agent-driven file reads and overwrites.

## Goals
- Persist files and folders locally in the browser.
- Support unlimited-length text payload handling from the application layer.
- Return line-numbered reads and structured errors for missing paths.

## Scope / non-goals
- In scope: tree persistence, read/write operations, directory inference, file metadata, transcript synchronization.
- Non-goals: OS-level file access, binary diffing, git integration.

## User flows / UX / design notes
- Tool writes update the file tree immediately.
- Tool reads return content to the agent and optionally highlight the file in the explorer.
- User can browse folders in a tree sidebar.

## Functional requirements
- Maintain a file table keyed by absolute path.
- Derive directory nodes from stored file paths.
- `file_write` creates or overwrites the full content at the target path.
- `file_read` returns numbered lines and structured not-found errors.
- Keep the latest file tree available to the UI and chat transcript.

## Data model / schema
- `StoredFile`: path, content, updatedAt, size.
- `FileTreeNode`: name, path, kind, children.

## API contracts
- No direct server persistence; execution happens client-side in response to SSE tool_call events.
- `POST /api/chat/tool-result` forwards the local result to the backend agent session.

## Edge cases / failure modes
- Missing file, empty file, very large file, invalid path, duplicate writes.

## Acceptance criteria
- Files persist across page refreshes.
- Read tool returns line-numbered content.
- Missing file returns structured error without breaking the chat session.

## Test plan / test cases
- Frontend unit tests for write, overwrite, read, and tree derivation.
- Manual browser test for refresh persistence.

## Implementation notes
- Use IndexedDB directly to avoid extra runtime dependencies.
- Normalize paths and require `/home/user/` prefix.

## Status / open questions
- Status: done.
