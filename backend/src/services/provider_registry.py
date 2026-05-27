from src.config import Settings
from src.services.groq import GroqService
from src.services.openrouter import OpenRouterService


class ProviderRegistry:
    def __init__(self, settings: Settings) -> None:
        self._providers = {
            'openrouter': OpenRouterService(settings),
            'groq': GroqService(settings),
        }

    def get(self, provider_id: str):
        if provider_id not in self._providers:
            raise KeyError(f'Unsupported provider: {provider_id}')
        return self._providers[provider_id]
