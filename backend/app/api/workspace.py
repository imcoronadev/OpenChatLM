from __future__ import annotations
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from ..db.database import get_db
from ..db import models as db_models
from ..schemas.schemas import WorkspaceSet
from ..core.agent.tool_executor import _safe_resolve  # type: ignore
from sqlalchemy import select, update


router = APIRouter()


@router.get("/workspaces")
async def list_workspaces(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(db_models.AgentWorkspace).order_by(db_models.AgentWorkspace.created_at.desc()))
    return [
        {"id": w.id, "path": w.path, "active": w.active, "created_at": w.created_at.isoformat()}
        for w in res.scalars().all()
    ]


@router.post("/workspaces")
async def set_workspace(payload: WorkspaceSet, db: AsyncSession = Depends(get_db)):
    p = Path(payload.path).expanduser()
    if not p.exists() or not p.is_dir():
        raise HTTPException(400, f"Directory does not exist: {payload.path}")
    abs_path = str(p.resolve())
    # deactivate others
    await db.execute(update(db_models.AgentWorkspace).values(active=False))
    from uuid import uuid4
    w = db_models.AgentWorkspace(id=str(uuid4()), path=abs_path, active=True)
    db.add(w)
    await db.commit()
    await db.refresh(w)
    return {"id": w.id, "path": w.path, "active": True}


@router.get("/workspaces/active")
async def active_workspace(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(db_models.AgentWorkspace).where(db_models.AgentWorkspace.active.is_(True)))
    w = res.scalars().first()
    if not w:
        return {"active": None}
    return {"id": w.id, "path": w.path, "active": True}


@router.delete("/workspaces/{workspace_id}")
async def delete_workspace(workspace_id: str, db: AsyncSession = Depends(get_db)):
    w = await db.get(db_models.AgentWorkspace, workspace_id)
    if not w:
        raise HTTPException(404, "workspace not found")
    await db.delete(w)
    await db.commit()
    return {"ok": True}


@router.get("/files")
async def list_dir(path: str = ".", db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(db_models.AgentWorkspace).where(db_models.AgentWorkspace.active.is_(True)))
    w = res.scalars().first()
    if not w:
        raise HTTPException(400, "No active workspace")
    try:
        target = _safe_resolve(w.path, path)
    except PermissionError as e:
        raise HTTPException(403, str(e))
    if not target.exists() or not target.is_dir():
        raise HTTPException(404, "directory not found")
    return {
        "path": str(target),
        "entries": [
            {"name": e.name, "type": "dir" if e.is_dir() else "file", "size": e.stat().st_size if e.is_file() else None}
            for e in sorted(target.iterdir())
        ],
    }


@router.get("/files/read")
async def read_file(path: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(db_models.AgentWorkspace).where(db_models.AgentWorkspace.active.is_(True)))
    w = res.scalars().first()
    if not w:
        raise HTTPException(400, "No active workspace")
    try:
        target = _safe_resolve(w.path, path)
    except PermissionError as e:
        raise HTTPException(403, str(e))
    if not target.exists() or not target.is_file():
        raise HTTPException(404, "file not found")
    return {"path": str(target), "content": target.read_text(encoding="utf-8", errors="replace")}