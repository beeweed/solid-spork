import asyncio
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from src.api_models import ToolResultSubmission


@dataclass
class PendingToolCall:
    session_id: str
    tool_use_id: str
    future: asyncio.Future[ToolResultSubmission]


class AgentSessionManager:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._pending: dict[str, PendingToolCall] = {}

    async def create_session(self) -> str:
        return f'session_{uuid4().hex}'

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
