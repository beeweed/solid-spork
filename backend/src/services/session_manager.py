import asyncio
import json
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator, Awaitable, Callable
from uuid import uuid4

from src.api_models import ToolResultSubmission


@dataclass
class PendingToolCall:
    session_id: str
    tool_use_id: str
    future: asyncio.Future[ToolResultSubmission]


@dataclass
class StreamEvent:
    id: int
    event: str
    data: dict[str, Any]


@dataclass
class AgentRunSession:
    session_id: str
    events: list[StreamEvent] = field(default_factory=list)
    next_event_id: int = 1
    done: bool = False
    task: asyncio.Task[None] | None = None
    condition: asyncio.Condition = field(default_factory=asyncio.Condition)
    unresolved_tool_calls: dict[str, StreamEvent] = field(default_factory=dict)


class AgentSessionManager:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._pending: dict[str, PendingToolCall] = {}
        self._sessions: dict[str, AgentRunSession] = {}

    async def create_session(self) -> str:
        return f'session_{uuid4().hex}'

    async def start_stream(
        self,
        session_id: str,
        runner_factory: Callable[[], AsyncGenerator[tuple[str, dict[str, Any]], None]],
    ) -> None:
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                session = AgentRunSession(session_id=session_id)
                self._sessions[session_id] = session
            if session.task is not None or session.done:
                return
            session.task = asyncio.create_task(self._consume_stream(session_id, runner_factory))

    async def _consume_stream(
        self,
        session_id: str,
        runner_factory: Callable[[], AsyncGenerator[tuple[str, dict[str, Any]], None]],
    ) -> None:
        try:
            async for event_name, event_payload in runner_factory():
                await self.append_event(session_id, event_name, event_payload)
        except Exception as exc:  # pragma: no cover - defensive guard
            await self.append_event(
                session_id,
                'error',
                {
                    'message': str(exc),
                    'code': 'session_runner_error',
                },
            )
            await self.append_event(session_id, 'done', {'status': 'error'})
        finally:
            await self.mark_done(session_id)

    async def append_event(self, session_id: str, event: str, data: dict[str, Any]) -> int:
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                session = AgentRunSession(session_id=session_id)
                self._sessions[session_id] = session

            record = StreamEvent(id=session.next_event_id, event=event, data=data)
            session.next_event_id += 1
            session.events.append(record)

            if event == 'tool_call':
                tool_use_id = str(data.get('toolUseId', ''))
                if tool_use_id:
                    session.unresolved_tool_calls[tool_use_id] = record
            elif event == 'tool_result_ack':
                tool_use_id = str(data.get('toolUseId', ''))
                if tool_use_id:
                    session.unresolved_tool_calls.pop(tool_use_id, None)

        async with session.condition:
            session.condition.notify_all()
        return record.id

    async def mark_done(self, session_id: str) -> None:
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return
            session.done = True
            session.task = None

        async with session.condition:
            session.condition.notify_all()

    async def stream_session(self, session_id: str, after: int = 0) -> AsyncGenerator[str, None]:
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                raise LookupError(f'Unknown session id: {session_id}')
            replay = sorted(
                (record for record in session.unresolved_tool_calls.values() if record.id <= after),
                key=lambda record: record.id,
            )

        for record in replay:
            yield self._encode_sse(record)

        cursor = after
        while True:
            async with self._lock:
                session = self._sessions.get(session_id)
                if session is None:
                    raise LookupError(f'Unknown session id: {session_id}')
                events = [record for record in session.events if record.id > cursor]
                done = session.done

            if events:
                for record in events:
                    cursor = max(cursor, record.id)
                    yield self._encode_sse(record)
                continue

            if done:
                return

            try:
                async with session.condition:
                    await asyncio.wait_for(session.condition.wait(), timeout=15)
            except asyncio.TimeoutError:
                yield 'event: ping\ndata: {}\n\n'

    async def has_session(self, session_id: str) -> bool:
        async with self._lock:
            return session_id in self._sessions

    async def register_tool_call(self, session_id: str, tool_use_id: str) -> None:
        loop = asyncio.get_running_loop()
        future: asyncio.Future[ToolResultSubmission] = loop.create_future()
        async with self._lock:
            self._pending[tool_use_id] = PendingToolCall(
                session_id=session_id,
                tool_use_id=tool_use_id,
                future=future,
            )

    async def submit_tool_result(self, payload: ToolResultSubmission) -> bool:
        async with self._lock:
            pending = self._pending.get(payload.tool_use_id)
            if pending is None or pending.session_id != payload.session_id:
                return False
            if not pending.future.done():
                pending.future.set_result(payload)
            return True

    async def wait_for_tool_result(self, session_id: str, tool_use_id: str, timeout: int) -> ToolResultSubmission:
        async with self._lock:
            pending = self._pending.get(tool_use_id)
            if pending is None or pending.session_id != session_id:
                raise LookupError(f'Unknown tool use id: {tool_use_id}')
            future = pending.future
        try:
            return await asyncio.wait_for(future, timeout=timeout)
        finally:
            async with self._lock:
                self._pending.pop(tool_use_id, None)

    async def cleanup_session(self, session_id: str) -> None:
        async with self._lock:
            doomed = [tool_use_id for tool_use_id, pending in self._pending.items() if pending.session_id == session_id]
            for tool_use_id in doomed:
                pending = self._pending.pop(tool_use_id)
                if not pending.future.done():
                    pending.future.cancel()

    async def pending_count(self) -> int:
        async with self._lock:
            return len(self._pending)

    def _encode_sse(self, record: StreamEvent) -> str:
        return f'id: {record.id}\nevent: {record.event}\ndata: {json.dumps(record.data)}\n\n'