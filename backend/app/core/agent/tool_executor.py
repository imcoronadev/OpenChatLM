from __future__ import annotations
import asyncio
import re
import subprocess
from pathlib import Path
from typing import Any
from ..config import settings
from ..search_engine import run_search
from .tool_parser import extract_diff_preview


DENIED_COMMAND_PATTERNS = [
    r"\brm\s+-rf\s+/(?!tmp|workspace)",
    r"\bshutdown\b",
    r"\breboot\b",
    r"\bmkfs\b",
    r"\bdd\s+if=",
    r":\(\)\{\s*:\|:&\s*\};:",  # fork bomb
    r"\bformat\s+[a-zA-Z]:",
    r"\bdel\s+/[sq]\b",
]


def _safe_resolve(workspace_root: str, requested: str) -> Path:
    root = Path(workspace_root).resolve()
    target = (root / requested).resolve() if not Path(requested).is_absolute() else Path(requested).resolve()
    try:
        target.relative_to(root)
    except ValueError:
        raise PermissionError(f"Path '{requested}' is outside workspace '{root}'")
    return target


def _is_dangerous_command(cmd: str) -> str | None:
    for pat in DENIED_COMMAND_PATTERNS:
        if re.search(pat, cmd, re.IGNORECASE):
            return pat
    return None


async def tool_web_search(args: dict, _ctx: dict) -> dict:
    query = (args.get("query") or "").strip()
    n = int(args.get("n_results") or args.get("max_results") or 5)
    if not query:
        return {"ok": False, "error": "Missing 'query'"}
    formatted, results = await run_search(query, n=n)
    return {"ok": True, "context_block": formatted, "results": results}


async def tool_read_file(args: dict, ctx: dict) -> dict:
    workspace = ctx.get("workspace")
    if not workspace:
        return {"ok": False, "error": "No workspace set"}
    path = args.get("path")
    if not path:
        return {"ok": False, "error": "Missing 'path'"}
    try:
        target = _safe_resolve(workspace, path)
    except PermissionError as e:
        return {"ok": False, "error": str(e)}
    if not target.exists() or not target.is_file():
        return {"ok": False, "error": f"File not found: {path}"}
    max_chars = int(args.get("max_chars") or 20000)
    text = target.read_text(encoding="utf-8", errors="replace")[:max_chars]
    return {"ok": True, "path": str(target), "content": text, "truncated": len(text) >= max_chars}


async def tool_list_dir(args: dict, ctx: dict) -> dict:
    workspace = ctx.get("workspace")
    if not workspace:
        return {"ok": False, "error": "No workspace set"}
    path = args.get("path") or "."
    try:
        target = _safe_resolve(workspace, path)
    except PermissionError as e:
        return {"ok": False, "error": str(e)}
    if not target.exists() or not target.is_dir():
        return {"ok": False, "error": f"Directory not found: {path}"}
    entries: list[dict] = []
    for entry in sorted(target.iterdir()):
        entries.append(
            {
                "name": entry.name,
                "type": "dir" if entry.is_dir() else "file",
                "size": entry.stat().st_size if entry.is_file() else None,
            }
        )
    return {"ok": True, "path": str(target), "entries": entries}


async def tool_write_file(args: dict, ctx: dict) -> dict:
    workspace = ctx.get("workspace")
    if not workspace:
        return {"ok": False, "error": "No workspace set"}
    path = args.get("path")
    content = args.get("content")
    if not path or content is None:
        return {"ok": False, "error": "Missing 'path' or 'content'"}
    try:
        target = _safe_resolve(workspace, path)
    except PermissionError as e:
        return {"ok": False, "error": str(e)}
    target.parent.mkdir(parents=True, exist_ok=True)
    prev = target.read_text(encoding="utf-8", errors="replace") if target.exists() else ""
    target.write_text(content, encoding="utf-8")
    return {"ok": True, "path": str(target), "preview": extract_diff_preview(prev, content)}


async def tool_edit_file(args: dict, ctx: dict) -> dict:
    workspace = ctx.get("workspace")
    if not workspace:
        return {"ok": False, "error": "No workspace set"}
    path = args.get("path")
    old_string = args.get("old_string")
    new_string = args.get("new_string")
    if not path or old_string is None or new_string is None:
        return {"ok": False, "error": "Missing 'path', 'old_string' or 'new_string'"}
    try:
        target = _safe_resolve(workspace, path)
    except PermissionError as e:
        return {"ok": False, "error": str(e)}
    if not target.exists():
        return {"ok": False, "error": f"File not found: {path}"}
    text = target.read_text(encoding="utf-8")
    if old_string not in text:
        return {"ok": False, "error": "old_string not found in file"}
    new_text = text.replace(old_string, new_string, 1)
    target.write_text(new_text, encoding="utf-8")
    return {"ok": True, "path": str(target), "preview": extract_diff_preview(text, new_text)}


async def tool_run_command(args: dict, ctx: dict) -> dict:
    workspace = ctx.get("workspace")
    if not workspace:
        return {"ok": False, "error": "No workspace set"}
    cmd = args.get("command")
    if not cmd:
        return {"ok": False, "error": "Missing 'command'"}
    bad = _is_dangerous_command(cmd)
    if bad:
        return {"ok": False, "error": f"Command blocked by safety policy: matched '{bad}'"}
    timeout = int(args.get("timeout") or settings.command_timeout_seconds)
    try:
        proc = await asyncio.create_subprocess_shell(
            cmd,
            cwd=workspace,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout_b, stderr_b = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            return {"ok": False, "error": f"Command timed out after {timeout}s"}
        return {
            "ok": proc.returncode == 0,
            "returncode": proc.returncode,
            "stdout": stdout_b.decode(errors="replace")[:8000],
            "stderr": stderr_b.decode(errors="replace")[:8000],
        }
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}"}


TOOL_IMPLS: dict[str, Any] = {
    "WebSearch": tool_web_search,
    "ReadFile": tool_read_file,
    "ListDir": tool_list_dir,
    "WriteFile": tool_write_file,
    "EditFile": tool_edit_file,
    "RunCommand": tool_run_command,
}


TOOL_PERMISSIONS: dict[str, str] = {
    "WebSearch": "approve",
    "ReadFile": "auto",
    "ListDir": "auto",
    "WriteFile": "approve",
    "EditFile": "approve",
    "RunCommand": "approve",
}


TOOL_DESCRIPTIONS: dict[str, str] = {
    "WebSearch": "Search the public web via DuckDuckGo HTML.",
    "ReadFile": "Read a file's content from the workspace.",
    "ListDir": "List directory entries in the workspace.",
    "WriteFile": "Create or overwrite a file with new content.",
    "EditFile": "Replace a string in an existing file.",
    "RunCommand": "Run a shell command (host, no sandbox).",
}


TOOL_SCHEMAS: dict[str, dict] = {
    "WebSearch": {"query": "string", "n_results": "int?"},
    "ReadFile": {"path": "string", "max_chars": "int?"},
    "ListDir": {"path": "string?"},
    "WriteFile": {"path": "string", "content": "string"},
    "EditFile": {"path": "string", "old_string": "string", "new_string": "string"},
    "RunCommand": {"command": "string", "timeout": "int?"},
}


def list_tools() -> list[dict]:
    return [
        {
            "name": name,
            "permission": TOOL_PERMISSIONS[name],
            "description": TOOL_DESCRIPTIONS[name],
            "schema": TOOL_SCHEMAS[name],
        }
        for name in TOOL_IMPLS
    ]


async def execute(name: str, args: dict, ctx: dict) -> dict:
    impl = TOOL_IMPLS.get(name)
    if not impl:
        return {"ok": False, "error": f"Unknown tool '{name}'"}
    try:
        return await impl(args, ctx)
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}"}