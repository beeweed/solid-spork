from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ChatMessage(BaseModel):
    role: Literal['system', 'user', 'assistant']
    content: str


class ChatRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    messages: list[ChatMessage]
    api_key: str = Field(..., alias='apiKey', min_length=1)
    model: str = Field(..., min_length=1)
    provider: str = Field(default='openrouter', min_length=1)


class ToolResultSubmission(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    session_id: str = Field(..., alias='sessionId')
    tool_use_id: str = Field(..., alias='toolUseId')
    name: str
    content: str
    is_error: bool = Field(default=False, alias='isError')


class ModelsRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    api_key: str = Field(..., alias='apiKey', min_length=1)


class ModelOption(BaseModel):
    id: str
    name: str
    context_length: Optional[int] = None
    supports_tools: bool = False
    pricing: dict[str, Any] = Field(default_factory=dict)
    provider: str = 'openrouter'
