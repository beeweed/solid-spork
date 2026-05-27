import asyncio

import pytest

from src.api_models import ToolResultSubmission
from src.services.session_manager import AgentSessionManager


@pytest.mark.asyncio
async def test_session_manager_resolves_tool_result():
    manager = AgentSessionManager()
    session_id = await manager.create_session()
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
