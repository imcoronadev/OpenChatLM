from __future__ import annotations
from fastapi import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from ..db.database import get_db
from ..db import models as db_models
from ..schemas.schemas import SettingUpdate
from sqlalchemy import select


router = APIRouter()


@router.get("/settings")
async def list_settings(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(db_models.Setting))
    return {s.key: s.value for s in res.scalars().all()}


@router.put("/settings/{key}")
async def set_setting(key: str, payload: SettingUpdate, db: AsyncSession = Depends(get_db)):
    existing = await db.get(db_models.Setting, key)
    if existing:
        existing.value = payload.value
    else:
        db.add(db_models.Setting(key=key, value=payload.value))
    await db.commit()
    return {"ok": True, "key": key, "value": payload.value}