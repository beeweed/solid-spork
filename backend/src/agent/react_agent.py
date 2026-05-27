import json
import re
import asyncio
from collections import deque
from dataclasses import dataclass, field
from typing import AsyncGenerator, Optional, Callable

import httpx

from src.api_models import ChatRequest
from src.agent.systemprompt import SYSTEM_PROMPT
from src.agent.tool_registry import ToolRegistry
from src.config import Settings
from src.services.provider_registry import ProviderRegistry
from src.services.session_manager import AgentSessionManager


@dataclass
class AggregatedToolCall:
    id: str = ''
    function_name: str = ''
    function_arguments: str = ''


@dataclass
class LLMTurnResult:
    content: str = ''
    tool_calls: list[dict] = field(default_factory=list)


class ReactAgent:
    def __init__(
        self,
        settings: Settings,
        provider_registry: ProviderRegistry,
        tool_registry: ToolRegistry,
        session_manager: AgentSessionManager,
    ) -> None:
        self._settings = settings
        self._provider_registry = provider_registry
        self._tool_registry = tool_registry
        self._session_manager = session_manager
        self._recent_tool_signatures: deque[str] = deque(maxlen=6)

    async def run_stream(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        session_id = await self._session_manager.create_session()
        provider = self._provider_registry.get(request.provider)
        messages = [{'role': 'system', 'content': SYSTEM_PROMPT}]
        messages.extend(message.model_dump() for message in request.messages)
        self._recent_tool_signatures.clear()

        try:
            yield self._encode_sse('session', {'sessionId': session_id})

            for iteration in range(1, self._settings.max_iterations + 1):
                yield self._encode_sse('iteration', {'current': iteration, 'max': self._settings.max_iterations})
                yield self._encode_sse('thinking', {'active': True, 'label': 'thinking....'})

                payload = {
                    'model': request.model,
                    'messages': messages,
                    'tools': self._tool_registry.get_tools(),
                    'tool_choice': 'auto',
                    'parallel_tool_calls': False,
                    'stream': True,
                }

                turn_result: Optional[LLMTurnResult] = None
                async for event_name, event_payload in self._stream_llm_turn(
                    stream_factory=lambda: provider.stream_chat(request.api_key, payload)
                ):
                    if event_name == 'final':
                        turn_result = event_payload
                        continue
                    yield self._encode_sse(event_name, event_payload)

                if turn_result is None:
                    raise RuntimeError('Provider stream finished without a final result payload.')

                if turn_result.tool_calls:
                    messages.append(
                        {
                            'role': 'assistant',
                            'content': turn_result.content or None,
                            'tool_calls': turn_result.tool_calls,
                        }
                    )

                    for tool_call in turn_result.tool_calls:
                        tool_name = tool_call['function']['name']
                        raw_arguments = tool_call['function'].get('arguments', '{}')
                        parsed_arguments = self._parse_tool_arguments(raw_arguments)
                        signature = self._tool_signature(tool_name, parsed_arguments)
                        if self._is_repeated_tool_call(signature):
                            raise RuntimeError('Repeated tool call pattern detected. Stopping to prevent a loop.')

                        await self._session_manager.register_tool_call(session_id, tool_call['id'])
                        yield self._encode_sse(
                            'tool_call',
                            {
                                'sessionId': session_id,
                                'toolUseId': tool_call['id'],
                                'name': tool_name,
                                'arguments': parsed_arguments,
                                'displayLabel': 'create' if tool_name == 'file_write' else 'read',
                                'displayPath': parsed_arguments.get('file_path', ''),
                            },
                        )
                        result = await self._session_manager.wait_for_tool_result(
                            session_id=session_id,
                            tool_use_id=tool_call['id'],
                            timeout=self._settings.tool_result_timeout_seconds,
                        )
                        yield self._encode_sse(
                            'tool_result_ack',
                            {
                                'toolUseId': result.tool_use_id,
                                'name': result.name,
                                'isError': result.is_error,
                            },
                        )
                        messages.append(
                            {
                                'role': 'tool',
                                'tool_call_id': result.tool_use_id,
                                'name': result.name,
                                'content': result.content,
                            }
                        )
                    continue

                if turn_result.content.strip():
                    messages.append({'role': 'assistant', 'content': turn_result.content})
                yield self._encode_sse('done', {'status': 'completed'})
                return

            yield self._encode_sse(
                'error',
                {
                    'message': f'Max iterations ({self._settings.max_iterations}) reached before completion.',
                    'code': 'max_iterations_reached',
                },
            )
            yield self._encode_sse('done', {'status': 'max_iterations_reached'})
        except httpx.HTTPStatusError as exc:
            yield self._encode_sse(
                'error',
                {
                    'message': f'Provider request failed with status {exc.response.status_code}.',
                    'detail': exc.response.text,
                    'code': 'provider_http_error',
                },
            )
            yield self._encode_sse('done', {'status': 'error'})
        except asyncio.TimeoutError:
            yield self._encode_sse(
                'error',
                {
                    'message': 'Timed out waiting for the browser to finish the requested tool call.',
                    'code': 'tool_timeout',
                },
            )
            yield self._encode_sse('done', {'status': 'error'})
        except Exception as exc:  # pragma: no cover
            yield self._encode_sse('error', {'message': str(exc), 'code': 'agent_error'})
            yield self._encode_sse('done', {'status': 'error'})
        finally:
            await self._session_manager.cleanup_session(session_id)

    async def _stream_llm_turn(
        self,
        stream_factory: Callable[[], AsyncGenerator[str, None]],
    ) -> AsyncGenerator[tuple[str, object], None]:
        content_parts: list[str] = []
        tool_call_parts: dict[int, AggregatedToolCall] = {}

        async for raw_line in stream_factory():
            if raw_line.startswith(':') or not raw_line.startswith('data: '):
                continue

            payload = raw_line[6:]
            if payload == '[DONE]':
                break

            data = json.loads(payload)
            choices = data.get('choices') or []
            if not choices:
                continue

            choice = choices[0]
            delta = choice.get('delta') or {}
            finish_reason = choice.get('finish_reason')

            content_delta = delta.get('content')
            if content_delta:
                content_parts.append(content_delta)
                yield 'text_delta', {'delta': content_delta}

            for tool_call_delta in delta.get('tool_calls') or []:
                index = tool_call_delta.get('index', 0)
                aggregate = tool_call_parts.setdefault(index, AggregatedToolCall())
                if tool_call_delta.get('id'):
                    aggregate.id = tool_call_delta['id']
                function_payload = tool_call_delta.get('function') or {}
                if function_payload.get('name'):
                    aggregate.function_name += function_payload['name']
                if function_payload.get('arguments'):
                    aggregate.function_arguments += function_payload['arguments']

            if finish_reason == 'tool_calls':
                yield 'final', LLMTurnResult(
                    content=''.join(content_parts),
                    tool_calls=[
                        {
                            'id': aggregate.id,
                            'type': 'function',
                            'function': {
                                'name': aggregate.function_name,
                                'arguments': aggregate.function_arguments,
                            },
                        }
                        for _, aggregate in sorted(tool_call_parts.items())
                    ],
                )
                return

            if finish_reason == 'stop':
                yield 'final', LLMTurnResult(content=''.join(content_parts))
                return

        yield 'final', LLMTurnResult(content=''.join(content_parts))

    def _encode_sse(self, event: str, data: dict) -> str:
        return f'event: {event}\ndata: {json.dumps(data)}\n\n'

    def _parse_tool_arguments(self, raw_arguments: str) -> dict:
        text = raw_arguments.strip() or '{}'
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            repaired = re.sub(r',(?=\s*[}\]])', '', text)
            return json.loads(repaired)

    def _tool_signature(self, tool_name: str, payload: dict) -> str:
        return f'{tool_name}:{json.dumps(payload, sort_keys=True)}'

    def _is_repeated_tool_call(self, signature: str) -> bool:
        self._recent_tool_signatures.append(signature)
        last_four = list(self._recent_tool_signatures)[-4:]
        return len(last_four) == 4 and len(set(last_four)) == 1
