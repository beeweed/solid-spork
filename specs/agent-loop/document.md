# ReAct agent loop

## Overview
Implement a backend agent runtime that calls OpenRouter's OpenAI-compatible chat completions endpoint with native tool definitions, streams assistant tokens over SSE, pauses on tool requests, receives browser-executed tool results, and resumes until completion or max iterations.

## Goals
- Use native tool calling via OpenRouter `tools` and `tool_calls`.
- Support max 1000 iterations with loop safeguards.
- Stream text token-by-token and emit tool lifecycle events.
- Keep the orchestration async-safe and resilient.

## Scope / non-goals
- In scope: single-agent ReAct orchestration, OpenRouter integration, tool registry, session tracking, SSE event protocol, structured errors.
- Non-goals: multi-agent planning, server-side persistent storage, arbitrary shell execution.

## User flows / UX / design notes
- User submits a message.
- Frontend opens an SSE chat stream.
- Assistant begins typing with live tokens.
- If a tool is needed, a tool chip appears and the typing pauses.
- Frontend executes file tool locally, posts the result, and the assistant resumes.
- Final assistant output and iteration count remain visible in the transcript.

## Functional requirements
- Accept chat requests containing message history, selected provider/model, and client capabilities.
- Load system prompt from `agent/systemprompt.py`.
- Register `file_write` and `file_read` using the exact JSON schemas requested by the user.
- Send tools in every relevant OpenRouter request and let the model decide tool usage.
- Parse streaming delta chunks, including partial tool call arguments.
- Emit SSE events: session, iteration, text_delta, tool_call, tool_result_ack, thinking, done, error.
- Stop when no more tool calls remain or when 1000 iterations is reached.
- Detect repeated identical tool call payloads in a short window and surface a controlled failure.

## Data model / schema
- `ChatRequest`: messages, apiKey, model, provider, session options.
- `ToolCallEnvelope`: tool_call_id, function name, raw arguments JSON, parsed arguments.
- `PendingToolSession`: session_id, queue, pending tool calls, expiration timestamp.
- `StreamEvent`: event type plus JSON payload.

## API contracts
- `POST /api/chat/stream`: starts SSE stream.
- `POST /api/chat/tool-result`: accepts browser tool execution result for a pending call.
- `GET /api/health`: health status.
- `GET /api/ready`: readiness status.

## Edge cases / failure modes
- Invalid OpenRouter API key.
- Model lacks tool support.
- Tool call arguments arrive across multiple stream chunks.
- Browser never returns a tool result before timeout.
- Repeated tool call loop.
- Stream disconnect mid-run.

## Acceptance criteria
- Native tool calls are visible in OpenRouter requests.
- Assistant text streams progressively.
- Tool requests interrupt the stream and resume after tool result submission.
- Max iteration cap and repeated-call guard work.
- Structured error events surface recoverable and fatal failures.

## Test plan / test cases
- Unit test tool registry exact schema and names.
- Unit test loop guard / repeated call detection.
- Integration test tool-result handoff and SSE event ordering with mocked OpenRouter responses.
- Integration test max-iteration termination.

## Implementation notes
- Use `httpx.AsyncClient.stream` for OpenRouter SSE.
- Build a provider service so other vendors can be added later.
- Keep assistant internal reasoning hidden while still implementing ReAct behavior.

## Status / open questions
- Status: done.
- Open question: none blocking for MVP.
