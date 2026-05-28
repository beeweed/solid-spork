from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from src.agent.react_agent import ReactAgent
from src.agent.tool_registry import ToolRegistry
from src.api_models import ChatRequest, ModelsRequest, ToolResultSubmission
from src.config import get_settings
from src.services.provider_registry import ProviderRegistry
from src.services.session_manager import AgentSessionManager

settings = get_settings()
session_manager = AgentSessionManager()
provider_registry = ProviderRegistry(settings)
tool_registry = ToolRegistry()
react_agent = ReactAgent(settings, provider_registry, tool_registry, session_manager)

app = FastAPI(title='Agent Workbench API')
app.state.settings = settings
app.state.session_manager = session_manager
app.state.provider_registry = provider_registry
app.state.react_agent = react_agent

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


def _streaming_response(session_id: str, after: int = 0) -> StreamingResponse:
    headers = {
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    }
    return StreamingResponse(
        app.state.session_manager.stream_session(session_id, after=after),
        media_type='text/event-stream',
        headers=headers,
    )


@app.get('/api/health')
async def health_check() -> dict[str, str]:
    return {'status': 'healthy'}


@app.get('/api/ready')
async def readiness_check() -> dict[str, str]:
    return {'status': 'ready'}


@app.post('/api/providers/{provider_id}/models')
async def list_models(provider_id: str, payload: ModelsRequest):
    try:
        provider = app.state.provider_registry.get(provider_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    models = await provider.list_models(payload.api_key)
    return {'models': [model.model_dump() for model in models]}


@app.post('/api/chat/tool-result')
async def submit_tool_result(payload: ToolResultSubmission):
    accepted = await app.state.session_manager.submit_tool_result(payload)
    if not accepted:
        raise HTTPException(status_code=404, detail='Tool session not found or already resolved.')
    return JSONResponse({'status': 'accepted'})


@app.post('/api/chat/stream')
async def chat_stream(payload: ChatRequest):
    agent: ReactAgent = app.state.react_agent
    session_id = await app.state.session_manager.create_session()
    await app.state.session_manager.start_stream(
        session_id,
        lambda: agent.run_events(payload, session_id),
    )
    return _streaming_response(session_id)


@app.get('/api/chat/stream/{session_id}')
async def resume_chat_stream(session_id: str, after: int = 0):
    exists = await app.state.session_manager.has_session(session_id)
    if not exists:
        raise HTTPException(status_code=404, detail=f'Unknown session id: {session_id}')
    return _streaming_response(session_id, after=after)