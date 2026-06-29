from __future__ import annotations
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .config import settings
from .db.database import init_db
from .core.ollama_client import ollama
from .api import (
    chat as chat_api,
    models as models_api,
    sessions as sessions_api,
    messages as messages_api,
    skills as skills_api,
    search as search_api,
    settings as settings_api,
    i18n as i18n_api,
    workspace as workspace_api,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await ollama.close()


app = FastAPI(title="OpenChat LM", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(models_api.router, prefix="/api")
app.include_router(chat_api.router, prefix="/api")
app.include_router(sessions_api.router, prefix="/api")
app.include_router(messages_api.router, prefix="/api")
app.include_router(skills_api.router, prefix="/api")
app.include_router(search_api.router, prefix="/api")
app.include_router(settings_api.router, prefix="/api")
app.include_router(i18n_api.router, prefix="/api")
app.include_router(workspace_api.router, prefix="/api")


# Serve frontend build if available
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/")
    async def index():
        return FileResponse(FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}")
    async def spa(full_path: str):
        candidate = FRONTEND_DIST / full_path
        if candidate.exists() and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    async def index():
        return {
            "name": "OpenChat LM",
            "version": "0.1.0",
            "frontend": "not built. Run `npm --prefix frontend run build` or use dev server.",
            "docs": "/docs",
        }