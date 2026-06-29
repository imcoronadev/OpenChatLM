from __future__ import annotations
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from ..core.ollama_client import ollama


router = APIRouter()


@router.get("/system")
async def system_status():
    ok = await ollama.ping()
    return {
        "ollama_reachable": ok,
        "ollama_host": ollama.host,
        "version": "0.1.0",
    }


@router.get("/models")
async def list_models():
    if not await ollama.ping():
        return {"models": [], "warning": "Ollama not reachable"}
    return {"models": await ollama.list_models()}


@router.get("/models/{name}")
async def show_model(name: str):
    return await ollama.show_model(name)


class PullRequest(BaseModel):
    name: str


@router.post("/models/pull")
async def pull_model(req: PullRequest):
    async def gen():
        async for chunk in ollama.pull_model(req.name):
            yield json.dumps(chunk) + "\n"

    return StreamingResponse(gen(), media_type="application/x-ndjson")