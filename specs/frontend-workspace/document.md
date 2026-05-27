# Responsive workspace frontend

## Overview
Build a professional, fully responsive workspace with a chat pane, inline tool activity, settings modal, and file explorer backed by IndexedDB.

## Goals
- Create a clean dark agent UI using Radix UI primitives.
- Ensure layouts adapt smoothly across mobile, tablet, laptop, and desktop.
- Keep interaction states obvious and robust.

## Scope / non-goals
- In scope: top bar, iteration display, chat transcript, composer, settings modal, file explorer, responsive behavior.
- Non-goals: multi-tab workspaces, collaborative presence.

## User flows / UX / design notes
- Desktop: split view with chat left and explorer right.
- Mobile: stacked layout with explorer below transcript.
- User bubbles are distinct; assistant output is plain transcript content.
- Tool chips appear inline near relevant assistant turn.
- Thinking indicator uses a subtle sheen animation.

## Functional requirements
- Show current iteration and reset to 0 for each new user message.
- Render assistant text as markdown-like prewrapped text without bubble chrome.
- Render user messages in bubbles.
- Show tool chips like `create: /path` and `read: /path`.
- Provide model/provider visibility in the top bar.
- Use frontend env config for backend base URL.

## Data model / schema
- `ChatTurn`, `ToolChip`, `UISettings`, `ConnectionState`.

## API contracts
- Consumes backend SSE and tool-result endpoint.

## Edge cases / failure modes
- Empty transcript, backend unavailable, no API key configured, narrow screens, long file paths, long assistant output.

## Acceptance criteria
- UI remains usable from 320px wide screens upward.
- No clipped controls or overlapping panes.
- All async states are represented.

## Test plan / test cases
- Frontend build and lint.
- Manual responsive verification in browser.

## Implementation notes
- Keep layout CSS grid-based with container queries by breakpoint.
- Use Radix Dialog for settings.

## Status / open questions
- Status: done.
