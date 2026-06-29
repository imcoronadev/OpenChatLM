from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from ..db.database import get_db
from ..db import models as db_models
from ..schemas.schemas import MessageOut


router = APIRouter()


def _to_out(m: db_models.Message) -> MessageOut:
    return MessageOut(
        id=m.id,
        role=m.role,
        content=m.content,
        thought=m.thought,
        tool_calls=m.tool_calls,
        tokens=m.tokens,
        created_at=m.created_at.isoformat(),
    )


@router.get("/sessions/{session_id}/messages")
async def list_messages(session_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(db_models.Message).where(db_models.Message.session_id == session_id).order_by(db_models.Message.created_at)
    )
    return [_to_out(m).model_dump() for m in res.scalars().all()]


@router.get("/messages/search")
async def search(q: str = Query(min_length=1), db: AsyncSession = Depends(get_db)):
    like = f"%{q}%"
    res = await db.execute(
        select(db_models.Message)
        .where(or_(db_models.Message.content.like(like), db_models.Message.thought.like(like)))
        .order_by(db_models.Message.created_at.desc())
        .limit(100)
    )
    return [_to_out(m).model_dump() for m in res.scalars().all()]