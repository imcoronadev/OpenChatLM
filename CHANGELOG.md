# Changelog

All notable changes to OpenChat LM are documented here. Format follows [Keep a Changelog](https://keepachangelog.com).

## [0.1.0] - 2026-06-29

### Added
- Initial release.
- Ollama integration: streaming chat, native thinking detection, model listing, model pull.
- Local model import (`scripts/import_model.py`) for `.gguf` files placed in `backend/models/`.
- Persistent and ephemeral chat sessions with SQLite + SQLAlchemy.
- Skills system with protected meta skills (`MetaThink`, `MetaTools`) and tool skills (`WebSearch`, `ReadFile`, `ListDir`, `WriteFile`, `EditFile`, `RunCommand`).
- Slash commands: `/search`, `/think`, `/skill`, `/model`, `/clear`, `/help`.
- Agent mode with workspace picker, approval dialog (with diff preview), bypass banner with TTL, audit log.
- Path traversal protection on all agent file operations; dangerous command blocklist.
- Guided mode fallback after 3 failed tool-call parses.
- Markdown rendering with shiki code highlighting (GitHub Dark theme).
- `<thought>` collapsible blocks for both native and MetaThink sources.
- i18n with English, Spanish, Portuguese, French (runtime switch).
- Glass / dark / light theme, no decorative emojis.
- Footer crediting Corona with link to GitHub.