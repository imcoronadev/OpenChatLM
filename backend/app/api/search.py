from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..core.search_engine import run_search


router = APIRouter()


class SearchRequest(BaseModel):
    query: str
    n_results: int = 5


@router.post("/search")
async def search(req: SearchRequest):
    if not req.query.strip():
        raise HTTPException(400, "query required")
    formatted, results = await run_search(req.query, n=req.n_results)
    return {"context": formatted, "results": results}