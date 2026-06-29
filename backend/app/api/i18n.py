from __future__ import annotations
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from ..paths import I18N_DIR


router = APIRouter()
SUPPORTED = ["en", "es", "pt", "fr"]


@router.get("/i18n/languages")
async def languages():
    return {"supported": SUPPORTED, "default": "en"}


@router.get("/i18n/{lang}")
async def get_locale(lang: str):
    if lang not in SUPPORTED:
        raise HTTPException(404, "language not supported")
    path = I18N_DIR / f"{lang}.json"
    if not path.exists():
        raise HTTPException(404, "locale file missing")
    return json.loads(path.read_text(encoding="utf-8"))