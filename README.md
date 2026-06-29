# OpenChat LM

> A friendly, local-first chat cockpit for any LLM you can run with Ollama. Built so tiny models (0.5B-3B) feel at home, while big ones still fly.

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Made with FastAPI](https://img.shields.io/badge/backend-FastAPI-009688.svg)
![Made with React](https://img.shields.io/badge/frontend-React-61dafb.svg)

Created by **Corona** - [github.com/ImCoronaDev](https://github.com/ImCoronaDev)

---

## Highlights

- **Ollama-powered** - any local model, from `qwen2.5:0.5b` to `llama3.1:70b`.
- **Models folder** - drop your `.gguf` / `.pth` / `.safetensors` in `backend/models/` and import them with one command.
- **Persistent and ephemeral chats**, full message history.
- **Markdown rendering** with GitHub-grade code highlighting (shiki).
- **`<thought>` blocks** rendered as collapsible panels. Native thinking supported for Qwen3 / DeepSeek-R1 and friends; an automatic **MetaThink** skill forces structured reasoning on small models.
- **`/search`** - real DuckDuckGo web search injected into context.
- **Skills system** - bundled protected skills (MetaThink, MetaTools, WebSearch, ReadFile, WriteFile, EditFile, ListDir, RunCommand) plus your own editable skills.
- **Agent mode** - the model can list, read, write, edit files and run commands inside a workspace you choose. Every destructive action requires approval. Bypass with a configurable TTL when you're sure.
- **Audit log** of every agent action, JSONL on disk.
- **i18n** - English (base), Spanish, Portuguese, French. Switch at runtime.
- **MIT license**. Open source, contributions welcome.

## Quick start

### 1. Install Ollama

```bash
# Linux/macOS: https://ollama.com/download
curl -fsSL https://ollama.com/install.sh | sh
ollama serve
# in another shell
ollama pull qwen2.5:0.5b
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Frontend (dev)

```bash
cd frontend
npm install
npm run dev
```

Open <http://127.0.0.1:5173>.

### 4. Frontend (production build, served by backend)

```bash
cd frontend && npm install && npm run build
cd ../backend && uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open <http://127.0.0.1:8000>.

### 5. Import a local GGUF

```bash
# Drop your file in backend/models/, then:
cd backend
python scripts/import_model.py models/your-model.gguf yourtag:q4
```

## Agent mode (in detail)

1. Click **Agent** in the sidebar.
2. Pick a workspace directory (the agent is sandboxed to it; path traversal is blocked).
3. Send a request that requires file or system work.
4. When the model wants to use `WriteFile`, `EditFile`, `WebSearch` or `RunCommand`, you get an approval dialog showing args and a diff preview.
5. **Approve & bypass** lets the next N seconds (configurable in Settings) pass without prompts. A countdown banner is shown.
6. Every decision is recorded in `backend/data/agent_audit.jsonl` and visible in the in-app audit log.

Small models that fail to emit `CALL_TOOL:Name {"arg": "value"}` correctly get a guided hint after 3 failures.

## Slash commands

| Command | Effect |
|---|---|
| `/search <query>` | Run a web search and inject results |
| `/think` | Force a `<thought>` block (MetaThink) |
| `/skill <name>` | Activate a skill for this turn |
| `/model <name>` | Switch the active model |
| `/clear` | Clear current session |
| `/help` | List commands |

## Project layout

```
openchat-lm/
  backend/    FastAPI, SQLAlchemy, Ollama client, agent engine
  frontend/   React + Vite + Tailwind + i18next
  models/     drop your .gguf / .pth / .safetensors here
```

See `CONTRIBUTING.md` to help out.

## License

MIT. See `LICENSE`.

---

Built with care by Corona.