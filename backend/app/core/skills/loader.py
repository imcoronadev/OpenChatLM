from __future__ import annotations
from pathlib import Path
import json
from ..paths import PROTECTED_SKILLS_DIR, USER_SKILLS_DIR


def _read_json(p: Path) -> dict | None:
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def load_protected_skills() -> list[dict]:
    out: list[dict] = []
    if not PROTECTED_SKILLS_DIR.exists():
        return out
    for p in sorted(PROTECTED_SKILLS_DIR.glob("*.json")):
        data = _read_json(p)
        if data:
            data["_source_path"] = str(p)
            out.append(data)
    return out


def load_user_skills() -> list[dict]:
    out: list[dict] = []
    if not USER_SKILLS_DIR.exists():
        return out
    for p in sorted(USER_SKILLS_DIR.glob("*.json")):
        data = _read_json(p)
        if data:
            data["_source_path"] = str(p)
            out.append(data)
    return out


def load_all_skills() -> list[dict]:
    return load_protected_skills() + load_user_skills()


def write_user_skill(skill_id: str, data: dict) -> Path:
    target = USER_SKILLS_DIR / f"{skill_id}.json"
    target.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return target


def delete_user_skill(skill_id: str) -> bool:
    target = USER_SKILLS_DIR / f"{skill_id}.json"
    if target.exists():
        target.unlink()
        return True
    return False