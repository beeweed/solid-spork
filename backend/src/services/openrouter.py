import json
from typing import Any, AsyncGenerator

import httpx

from src.api_models import ModelOption
from src.config import Settings


class OpenRouterService:
    provider_id = 'openrouter'

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def _headers(self, api_key: str) -> dict[str, str]:
        return {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'HTTP-Referer': self._settings.site_url,
            'X-OpenRouter-Title': self._settings.app_title,
        }

    async def list_models(self, api_key: str) -> list[ModelOption]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f'{self._settings.openrouter_base_url}/models',
                headers=self._headers(api_key),
            )
            response.raise_for_status()
        payload = response.json()
        models: list[ModelOption] = []
        for item in payload.get('data', []):
            supported_parameters = item.get('supported_parameters') or []
            models.append(
                ModelOption(
                    id=item['id'],
                    name=item.get('name') or item['id'],
                    context_length=item.get('context_length'),
                    supports_tools='tools' in supported_parameters,
                    pricing=item.get('pricing') or {},
                )
            )
        return sorted(models, key=lambda model: model.name.lower())

    async def stream_chat(self, api_key: str, payload: dict[str, Any]) -> AsyncGenerator[str, None]:
        async with httpx.AsyncClient(timeout=httpx.Timeout(connect=30.0, read=None, write=30.0, pool=30.0)) as client:
            async with client.stream(
                'POST',
                f'{self._settings.openrouter_base_url}/chat/completions',
                headers=self._headers(api_key),
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        yield line
