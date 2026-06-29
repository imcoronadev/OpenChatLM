# Contributing to OpenChat LM

First off, thanks for taking the time to contribute. Any help is welcome - bug reports, feature ideas, documentation, translations, code.

## Code of Conduct

This project follows the Contributor Covenant (see `CODE_OF_CONDUCT.md`). Be respectful, assume good faith, and help us keep this a friendly place.

## How can I help?

- **Report bugs** using the bug report template.
- **Suggest features** using the feature request template.
- **Translate** strings by editing files under `frontend/src/i18n/locales/`. Supported: `en`, `es`, `pt`, `fr`.
- **Write skills** that other users can enable by default (in `backend/skills/user/` JSON format).
- **Improve docs** - especially the README and the in-app Settings descriptions.
- **Code** - pick an open issue or propose a change first via an issue.

## Development setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Requires Python 3.11+ and a running Ollama (`ollama serve`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://127.0.0.1:5173> (Vite proxies `/api` to the backend).

### Lint & typecheck

```bash
# backend
ruff check backend
mypy backend/app

# frontend
cd frontend
npm run typecheck
npm run lint
```

## Code style

- **Python**: PEP 8, type hints, `black` formatting, `ruff` lint, `mypy --strict` for new modules.
- **TypeScript**: Prettier defaults, ESLint (`@typescript-eslint`), no `any` in new code unless clearly justified.
- **Commits**: short imperative subject (`Add /search dry-run`, `Fix approval dialog focus`). Group related changes.
- **Scope**: keep PRs focused. Big refactors get an issue first.

## Translating

1. Copy `frontend/src/i18n/locales/en.json` to a new `<lang>.json`.
2. Translate each value, keep keys unchanged.
3. Add the language to `frontend/src/i18n/index.ts` (`LANGUAGES` and the `resources` block).
4. Open a PR. The base locale (`en`) is updated first; translations follow.

## Skills and tools

A skill is a JSON file. Example:

```json
{
  "id": "code_reviewer",
  "name": "Code Reviewer",
  "description": "Reviews code for bugs and improvements",
  "system_prompt_addition": "You are a senior code reviewer. Be thorough and concise.",
  "trigger_keywords": ["review", "revisa", "code review"],
  "parameters": {}
}
```

Place user skills in `backend/skills/user/`. Protected skills (bundled with OpenChat LM, not user-editable) live in `backend/skills/_protected/`. Do not add new entries there without discussion.

## Pull request process

1. Open an issue describing the change if it is non-trivial.
2. Fork and create a feature branch.
3. Make your change, run linters and tests.
4. Update docs / translations if relevant.
5. Open a PR using the template. Fill in the checklist.
6. One approval from a maintainer is enough to merge. Squash merge by default.

## Releasing

Maintained by Corona. Versions follow `<major>.<minor>.<patch>`. Tag and push triggers a GitHub release with auto-generated notes.

## Questions?

Open a discussion on GitHub or DM @ImCoronaDev.

Thanks again.