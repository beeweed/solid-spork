from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    app_name: str = 'Agent Workbench API'
    openrouter_base_url: str = 'https://openrouter.ai/api/v1'
    groq_base_url: str = 'https://api.groq.com/openai/v1'
    app_title: str = 'Agent Workbench'
    site_url: str = 'http://localhost:3000'
    cors_origins: List[str] = Field(default_factory=lambda: ['*'])
    tool_result_timeout_seconds: int = 120
    max_iterations: int = 1000


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
