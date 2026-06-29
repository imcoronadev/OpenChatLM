from __future__ import annotations
import json
from fastapi import APIRouter, HTTPException
from ..core.skills.loader import load_all_skills, load_protected_skills, load_user_skills, write_user_skill, delete_user_skill
from ..schemas.schemas import SkillCreate, SkillUpdate


router = APIRouter()


def _serialize(s: dict) -> dict:
    out = dict(s)
    out.pop("_source_path", None)
    return out


@router.get("/skills")
async def list_all():
    return [_serialize(s) for s in load_all_skills()]


@router.get("/skills/protected")
async def list_protected():
    return [_serialize(s) for s in load_protected_skills()]


@router.get("/skills/user")
async def list_user():
    return [_serialize(s) for s in load_user_skills()]


@router.post("/skills/user")
async def create_user_skill(payload: SkillCreate):
    if payload.id.startswith("_"):
        raise HTTPException(400, "Skill id cannot start with underscore")
    if any(payload.id == p["id"] for p in load_protected_skills()):
        raise HTTPException(409, "Skill id conflicts with protected skill")
    data = payload.model_dump()
    data["protected"] = False
    data["builtin"] = False
    data["is_meta"] = False
    data["is_tool"] = False
    write_user_skill(payload.id, data)
    return _serialize(data)


@router.patch("/skills/user/{skill_id}")
async def update_user_skill(skill_id: str, payload: SkillUpdate):
    if any(skill_id == p["id"] for p in load_protected_skills()):
        raise HTTPException(403, "Cannot edit protected skills")
    users = load_user_skills()
    existing = next((s for s in users if s["id"] == skill_id), None)
    if not existing:
        raise HTTPException(404, "Skill not found")
    existing.pop("_source_path", None)
    for k, v in payload.model_dump(exclude_unset=True).items():
        existing[k] = v
    write_user_skill(skill_id, existing)
    return _serialize(existing)


@router.delete("/skills/user/{skill_id}")
async def delete_user_skill_route(skill_id: str):
    if any(skill_id == p["id"] for p in load_protected_skills()):
        raise HTTPException(403, "Cannot delete protected skills")
    ok = delete_user_skill(skill_id)
    if not ok:
        raise HTTPException(404, "Skill not found")
    return {"ok": True}