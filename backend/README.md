# OpenChat LM - Backend

FastAPI backend for OpenChat LM. Handles chat streaming, persistence, agent tools, skills, search and i18n.

## Requirements

- Python 3.11+
- Ollama running locally (`ollama serve`) - https://ollama.com

## Setup

```bash
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
# .venv\Scripts\activate    # Windows
pip install -r requirements.txt
cp .env.example .env
```

## Run

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API is then available at http://127.0.0.1:8000.
Interactive docs at http://127.0.0.1:8000/docs.

## Models directory

Place your `.gguf` / `.pth` / `.safetensors` files inside `models/`.
Use `python scripts/import_model.py <path-to-gguf> <tag>` to register them with Ollama.

## Skills

- `skills/_protected/` - bundled protected skills and meta tags (not editable, not removable).
- `skills/user/` - your custom skills, fully editable from the UI.