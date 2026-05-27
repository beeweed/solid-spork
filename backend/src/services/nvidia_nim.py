from typing import Any, AsyncGenerator

import httpx

from src.api_models import ModelOption
from src.config import Settings

_NON_TOOL_MODEL_IDS = frozenset({
    'nvidia/gliner-pii',
    'nvidia/nemoguard-jailbreak-detect',
    'nvidia/llama-3.1-nemoguard-8b-content-safety',
    'nvidia/llama-3.1-nemoguard-8b-topic-control',
    'nvidia/llama-3.1-nemotron-safety-guard-8b-v3',
    'nvidia/nemotron-content-safety-reasoning-4b',
    'nvidia/riva-translate-4b-instruct-v1_1',
})


class NvidiaNimService:
    provider_id = 'nvidia-nim'

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def _headers(self, api_key: str) -> dict[str, str]:
        return {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }

    async def list_models(self, api_key: str) -> list[ModelOption]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f'{self._settings.nvidia_nim_base_url}/models',
                headers=self._headers(api_key),
            )
            response.raise_for_status()
        payload = response.json()
        models: list[ModelOption] = []
        for item in payload.get('data', []):
            model_id = item['id']
            models.append(
                ModelOption(
                    id=model_id,
                    name=model_id,
                    context_length=item.get('context_length') or None,
                    supports_tools=model_id not in _NON_TOOL_MODEL_IDS,
                    pricing={},
                    provider='nvidia-nim',
                )
            )
        return sorted(models, key=lambda model: model.name.lower())

    async def stream_chat(self, api_key: str, payload: dict[str, Any]) -> AsyncGenerator[str, None]:
        async with httpx.AsyncClient(timeout=httpx.Timeout(connect=30.0, read=None, write=30.0, pool=30.0)) as client:
            async with client.stream(
                'POST',
                f'{self._settings.nvidia_nim_base_url}/chat/completions',
                headers=self._headers(api_key),
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        yield line
