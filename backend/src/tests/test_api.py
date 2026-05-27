import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


class StubAgent:
    async def run_stream(self, _payload):
        yield 'event: session\ndata: {"sessionId":"session_test"}\n\n'
        yield 'event: iteration\ndata: {"current":1,"max":1000}\n\n'
        yield 'event: text_delta\ndata: {"delta":"Hello"}\n\n'
        yield 'event: done\ndata: {"status":"completed"}\n\n'


@pytest.mark.asyncio
async def test_chat_stream_endpoint_returns_sse():
    original_agent = app.state.react_agent
    app.state.react_agent = StubAgent()
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://testserver') as client:
            response = await client.post(
                '/api/chat/stream',
                json={
                    'messages': [{'role': 'user', 'content': 'Hello'}],
                    'apiKey': 'test-key',
                    'model': 'openai/gpt-4o-mini',
                    'provider': 'openrouter',
                },
            )
    finally:
        app.state.react_agent = original_agent

    assert response.status_code == 200
    assert 'text/event-stream' in response.headers['content-type']
    assert 'event: text_delta' in response.text


@pytest.mark.asyncio
async def test_tool_result_not_found_returns_404():
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://testserver') as client:
        response = await client.post(
            '/api/chat/tool-result',
            json={
                'sessionId': 'missing',
                'toolUseId': 'missing',
                'name': 'file_read',
                'content': 'nope',
                'isError': True,
            },
        )
    assert response.status_code == 404
