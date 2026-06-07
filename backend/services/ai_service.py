"""Unified AI provider layer — Ollama (local), Gemini, or Anthropic."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx

from config import settings

logger = logging.getLogger(__name__)

_anthropic_client = None
_gemini_configured = False


def resolve_provider() -> str:
    choice = (settings.ai_provider or "auto").strip().lower()
    if choice == "ollama":
        return "ollama"
    if choice == "gemini" and settings.gemini_api_key:
        return "gemini"
    if choice == "anthropic" and settings.anthropic_api_key:
        return "anthropic"
    if choice == "auto":
        return "ollama"
    if settings.gemini_api_key:
        return "gemini"
    if settings.anthropic_api_key:
        return "anthropic"
    return "ollama"


def active_provider() -> str:
    return resolve_provider()


def _ensure_gemini():
    global _gemini_configured
    if not _gemini_configured:
        import google.generativeai as genai

        genai.configure(api_key=settings.gemini_api_key)
        _gemini_configured = True


def _ensure_anthropic():
    global _anthropic_client
    if _anthropic_client is None:
        import anthropic

        _anthropic_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _anthropic_client


async def check_ollama() -> dict[str, Any]:
    base = settings.ollama_base_url.rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{base}/api/tags")
            response.raise_for_status()
            models = [m.get("name") for m in response.json().get("models", [])]
            return {
                "reachable": True,
                "models": models,
                "configured_model": settings.ollama_model,
                "model_available": settings.ollama_model in models
                or any(settings.ollama_model.split(":")[0] in (m or "") for m in models),
            }
    except Exception as exc:
        return {"reachable": False, "error": str(exc)}


async def _ollama_chat(
    messages: list[dict[str, str]],
    *,
    json_mode: bool = False,
    temperature: float = 0.4,
    max_tokens: int = 8192,
) -> str:
    base = settings.ollama_base_url.rstrip("/")
    payload: dict[str, Any] = {
        "model": settings.ollama_model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }
    if json_mode:
        payload["format"] = "json"

    async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=10.0)) as client:
        response = await client.post(f"{base}/api/chat", json=payload)
        response.raise_for_status()
        data = response.json()
    content = (data.get("message") or {}).get("content", "")
    if not content:
        raise RuntimeError("Ollama returned an empty response")
    return content


async def _gemini_complete(
    prompt: str,
    *,
    system: str | None = None,
    temperature: float = 0.4,
    max_tokens: int = 8192,
) -> str:
    _ensure_gemini()
    import google.generativeai as genai

    model = genai.GenerativeModel(
        model_name=settings.gemini_model,
        system_instruction=system,
        generation_config=genai.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        ),
    )
    response = await model.generate_content_async(prompt)
    return response.text


async def _gemini_chat(
    message: str,
    history: list[dict[str, str]],
    *,
    system: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
) -> str:
    _ensure_gemini()
    import google.generativeai as genai

    model = genai.GenerativeModel(
        model_name=settings.gemini_model,
        system_instruction=system,
    )
    gemini_history = []
    for msg in history[-10:]:
        role = "user" if msg["role"] == "user" else "model"
        gemini_history.append({"role": role, "parts": [msg["content"]]})

    chat_session = model.start_chat(history=gemini_history)
    response = await chat_session.send_message_async(
        message,
        generation_config=genai.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        ),
    )
    return response.text


async def _anthropic_complete(
    prompt: str,
    *,
    system: str | None = None,
    temperature: float = 0.4,
    max_tokens: int = 8192,
) -> str:
    client = _ensure_anthropic()

    def _call():
        response = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=max_tokens,
            system=system or "",
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text

    return await asyncio.get_event_loop().run_in_executor(None, _call)


async def _anthropic_chat(
    message: str,
    history: list[dict[str, str]],
    *,
    system: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
) -> str:
    client = _ensure_anthropic()
    messages = [{"role": m["role"], "content": m["content"]} for m in history[-10:]]
    messages.append({"role": "user", "content": message})

    def _call():
        response = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=max_tokens,
            system=system or "",
            messages=messages,
        )
        return response.content[0].text

    return await asyncio.get_event_loop().run_in_executor(None, _call)


def _build_messages(
    prompt: str,
    *,
    system: str | None = None,
    history: list[dict[str, str]] | None = None,
) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    if history:
        for msg in history[-10:]:
            role = msg["role"]
            if role == "assistant":
                role = "assistant"
            elif role == "model":
                role = "assistant"
            messages.append({"role": role, "content": msg["content"]})
    messages.append({"role": "user", "content": prompt})
    return messages


async def complete(
    prompt: str,
    *,
    system: str | None = None,
    json_mode: bool = False,
    temperature: float = 0.4,
    max_tokens: int = 8192,
) -> str:
    provider = resolve_provider()
    logger.debug("AI complete via %s", provider)

    if provider == "ollama":
        messages = _build_messages(prompt, system=system)
        return await _ollama_chat(
            messages,
            json_mode=json_mode,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    if provider == "gemini":
        return await _gemini_complete(
            prompt,
            system=system,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    return await _anthropic_complete(
        prompt,
        system=system,
        temperature=temperature,
        max_tokens=max_tokens,
    )


async def chat(
    message: str,
    history: list[dict[str, str]],
    *,
    system: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
) -> str:
    provider = resolve_provider()
    logger.debug("AI chat via %s", provider)

    if provider == "ollama":
        messages = _build_messages(message, system=system, history=history)
        return await _ollama_chat(
            messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    if provider == "gemini":
        return await _gemini_chat(
            message,
            history,
            system=system,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    return await _anthropic_chat(
        message,
        history,
        system=system,
        temperature=temperature,
        max_tokens=max_tokens,
    )
