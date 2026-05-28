import asyncio

import pytest

from src.api_models import ToolResultSubmission
from src.services.session_manager import AgentSessionManager


@pytest.mark.asyncio
async def test_session_manager_resolves_tool_result():
    manager = AgentSessionManager()
    session_id = await manager.create_session()
    assert session_id.isdigit()
    assert len(session_id) == 20
    await manager.register_tool_call(session_id, 'tool_1')

    async def submit_later():
        await asyncio.sleep(0)
        await manager.submit_tool_result(
            ToolResultSubmission(
                sessionId=session_id,
                toolUseId='tool_1',
                name='file_read',
                content='ok',
                isError=False,
            )
        )

    asyncio.create_task(submit_later())
    result = await manager.wait_for_tool_result(session_id, 'tool_1', timeout=1)
    assert result.content == 'ok'


@pytest.mark.asyncio
async def test_stream_session_replays_unresolved_tool_call_after_resume_cursor():
    manager = AgentSessionManager()
    session_id = await manager.create_session()
    await manager.append_event(session_id, 'session', {'sessionId': session_id})
    await manager.append_event(
        session_id,
        'tool_call',
        {
            'sessionId': session_id,
            'toolUseId': 'tool_1',
            'name': 'file_read',
            'arguments': {'file_path': '/home/user/test.txt'},
            'displayLabel': 'read',
            'displayPath': '/home/user/test.txt',
        },
    )

    stream = manager.stream_session(session_id, after=2)
    chunk = await stream.__anext__()
    await stream.aclose()

    assert 'event: tool_call' in chunk
    assert 'tool_1' in chunk


@pytest.mark.asyncio
async def test_stream_session_replays_buffered_events_after_cursor():
    manager = AgentSessionManager()
    session_id = await manager.create_session()
    await manager.append_event(session_id, 'session', {'sessionId': session_id})
    await manager.append_event(session_id, 'text_delta', {'delta': 'Hello'})
    await manager.append_event(session_id, 'done', {'status': 'completed'})
    await manager.mark_done(session_id)

    chunks = [chunk async for chunk in manager.stream_session(session_id, after=1)]

    assert any('event: text_delta' in chunk for chunk in chunks)
    assert any('event: done' in chunk for chunk in chunks)
