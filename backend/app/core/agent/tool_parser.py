from __future__ import annotations
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


THOUGHT_RE = re.compile(r"<thought>([\s\S]*?)</thought>", re.IGNORECASE)
CALL_TOOL_RE = re.compile(
    r"CALL_TOOL:([A-Za-z_][A-Za-z0-9_]*)\s*(\{.*?\})",
    re.DOTALL,
)
CALL_TOOL_LINE_RE = re.compile(
    r"^\s*CALL_TOOL:([A-Za-z_][A-Za-z0-9_]*)\s*(\{.*\})\s*$",
    re.DOTALL,
)


@dataclass
class ParsedBlock:
    thought: str = ""
    tool_name: str | None = None
    tool_args: dict[str, Any] | None = None
    tool_error: str | None = None
    cleaned_text: str = ""


def parse(text: str) -> ParsedBlock:
    """Extract <thought> and CALL_TOOL blocks from a chunk of model output.

    Returns cleaned_text with both blocks stripped out so the frontend
    can render only the final response.
    """
    out = ParsedBlock()
    work = text

    tm = THOUGHT_RE.search(work)
    if tm:
        out.thought = tm.group(1).strip()
        work = (work[: tm.start()] + work[tm.end():]).strip()

    candidates: list[tuple[str, dict]] = []
    for m in CALL_TOOL_RE.finditer(work):
        name = m.group(1)
        raw = m.group(2).strip()
        try:
            args = json.loads(raw)
        except json.JSONDecodeError as e:
            candidates.append((name, {"_parse_error": str(e), "_raw": raw}))
            continue
        if not isinstance(args, dict):
            candidates.append((name, {"_parse_error": "args must be a JSON object"}))
            continue
        candidates.append((name, args))

    if candidates:
        name, args = candidates[-1]
        out.tool_name = name
        out.tool_args = args
        if "_parse_error" in args:
            out.tool_error = args["_parse_error"]

    work = CALL_TOOL_RE.sub("", work).strip()
    out.cleaned_text = work
    return out


def extract_diff_preview(old: str, new: str, context: int = 2) -> str:
    """Tiny unified diff for approval preview."""
    import difflib
    diff = difflib.unified_diff(
        old.splitlines(keepends=True),
        new.splitlines(keepends=True),
        fromfile="current",
        tofile="proposed",
        n=context,
    )
    return "".join(diff) or "(no textual changes)"