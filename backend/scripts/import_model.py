"""Register a local GGUF model with Ollama.

Usage:
    python scripts/import_model.py path/to/model.gguf mymodel:q4
"""
from __future__ import annotations
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.core.ollama_client import ollama  # noqa: E402


async def main(path: str, tag: str) -> None:
    p = Path(path).expanduser().resolve()
    if not p.exists():
        raise SystemExit(f"Model file not found: {path}")
    modelfile = (
        f"FROM {p}\n"
        'PARAMETER temperature 0.7\n'
        'PARAMETER num_ctx 4096\n'
        f"# Imported by OpenChat LM\n"
    )
    if not await ollama.ping():
        raise SystemExit(f"Ollama not reachable at {ollama.host}. Start it with `ollama serve`.")
    res = await ollama.create_model(tag, modelfile)
    print(f"Imported {p.name} as '{tag}': {res}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    asyncio.run(main(sys.argv[1], sys.argv[2]))