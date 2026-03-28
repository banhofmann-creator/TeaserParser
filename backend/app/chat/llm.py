"""LLM call for the chat assistant with structured output."""

import json
import logging

from pydantic import BaseModel

from app.chat.prompts import get_system_prompt
from app.config import settings

logger = logging.getLogger(__name__)


class ChatAction(BaseModel):
    action: str  # "update_status", "assign", "update_fields"
    opportunity_id: int
    status: str | None = None
    assigned_to: int | None = None
    fields: dict | None = None


class ChatResponse(BaseModel):
    message: str
    actions: list[ChatAction] = []


def call_chat_llm(messages: list[dict]) -> dict:
    """Call the LLM with conversation history and return structured response."""
    import litellm

    system_prompt = get_system_prompt()

    llm_messages = [{"role": "system", "content": system_prompt}] + messages

    response = litellm.completion(
        model="openrouter/openai/gpt-oss-120b",
        messages=llm_messages,
        extra_body={
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "chat_response",
                    "strict": True,
                    "schema": ChatResponse.model_json_schema(),
                },
            }
        },
        api_key=settings.openrouter_api_key,
    )

    content = response.choices[0].message.content
    data = json.loads(content)
    parsed = ChatResponse(**data)

    return parsed.model_dump()
