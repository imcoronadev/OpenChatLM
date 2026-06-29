from __future__ import annotations
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from ..db.database import get_db
from ..db import models as db_models
from ..schemas.schemas import SessionCreate, SessionUpdate, SessionOut


router = APIRouter()


def _to_out(s: db_models.ChatSession) -> SessionOut:
    return SessionOut(
        id=s.id,
        title=s.title,
        ephemeral=s.ephemeral,
        model=s.model,
        system_prompt=s.system_prompt,
        created_at=s.created_at.isoformat(),
        updated_at=s.updated_at.isoformat(),
    )


@router.get("/sessions")
async def list_sessions(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(db_models.ChatSession).order_by(db_models.ChatSession.updated_at.desc()))
    return [_to_out(s).model_dump() for s in res.scalars().all()]


@router.post("/sessions")
async def create_session(payload: SessionCreate, db: AsyncSession = Depends(get_db)):
    s = db_models.ChatSession(
        id=str(uuid.uuid4()),
        title=payload.title,
        ephemeral=payload.ephemeral,
        model=payload.model,
        system_prompt=payload.system_prompt,
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return _to_out(s).model_dump()


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    s = await db.get(db_models.ChatSession, session_id)
    if not s:
        raise HTTPException(404, "session not found")
    return _to_out(s).model_dump()


@router.patch("/sessions/{session_id}")
async def update_session(session_id: str, payload: SessionUpdate, db: AsyncSession = Depends(get_db)):
    s = await db.get(db_models.ChatSession, session_id)
    if not s:
        raise HTTPException(404, "session not found")
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(s, field, val)
    s.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(s)
    return _to_out(s).model_dump()


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    s = await db.get(db_models.ChatSession, session_id)
    if not s:
        raise HTTPException(404, "session not found")
    await db.delete(s)
    await db.commit()
    return {"ok": True}


@router.post("/sessions/{session_id}/clear")
async def clear_messages(session_id: str, db: AsyncSession = Depends(get_db)):
    s = await db.get(db_models.ChatSession, session_id)
    if not s:
        raise HTTPException(404, "session not found")
    await db.execute(delete(db_models.Message).where(db_models.Message.session_id == session_id))
    await db.commit()
    return {"ok": True}