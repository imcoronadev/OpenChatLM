from __future__ import annotations
import json
import httpx
from typing import AsyncGenerator, Any
from ..config import settings


class OllamaClient:
    def __init__(self, host: str | None = None) -> None:
        self.host = host or settings.ollama_host
        self._client = httpx.AsyncClient(timeout=httpx.Timeout(connect=10.0, read=None, write=None, pool=10.0))

    async def close(self) -> None:
        await self._client.aclose()

    async def ping(self) -> bool:
        try:
            r = await self._client.get(f"{self.host}/api/tags", timeout=5.0)
            return r.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> list[dict]:
        r = await self._client.get(f"{self.host}/api/tags")
        r.raise_for_status()
        return r.json().get("models", [])

    async def show_model(self, name: str) -> dict:
        r = await self._client.post(f"{self.host}/api/show", json={"name": name})
        r.raise_for_status()
        return r.json()

    async def pull_model(self, name: str) -> AsyncGenerator[dict, None]:
        async with self._client.stream("POST", f"{self.host}/api/pull", json={"name": name, "stream": True}) as resp:
            async for line in resp.aiter_lines():
                if not line:
                    continue
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    continue

    async def create_model(self, name: str, modelfile: str) -> dict:
        r = await self._client.post(
            f"{self.host}/api/create",
            json={"name": name, "modelfile": modelfile, "stream": False},
        )
        r.raise_for_status()
        return r.json()

    async def chat(
        self,
        model: str,
        messages: list[dict],
        think: bool = False,
        options: dict | None = None,
    ) -> AsyncGenerator[dict, None]:
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": True,
        }
        if think:
            payload["think"] = True
        if options:
            payload["options"] = options
        async with self._client.stream("POST", f"{self.host}/api/chat", json=payload) as resp:
            async for line in resp.aiter_lines():
                if not line:
                    continue
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    continue

    async def cancel_chat(self, model: str) -> None:
        try:
            await self._client.post(
                f"{self.host}/api/generate",
                json={"model": model, "keep_alive": 0},
                timeout=2.0,
            )
        except Exception:
            pass


ollama = OllamaClient()