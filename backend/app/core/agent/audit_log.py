from __future__ import annotations
import json
import time
from pathlib import Path
from ..paths import AUDIT_LOG


def log(
    session_id: str,
    tool: str,
    args: dict,
    decision: str,
    result_excerpt: str = "",
    approval_id: str | None = None,
) -> None:
    AUDIT_LOG.parent.mkdir(exist_ok=True)
    entry = {
        "ts": time.time(),
        "session_id": session_id,
        "approval_id": approval_id,
        "tool": tool,
        "args": args,
        "decision": decision,
        "result_excerpt": (result_excerpt or "")[:500],
    }
    with AUDIT_LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def read_tail(n: int = 200) -> list[dict]:
    if not AUDIT_LOG.exists():
        return []
    lines = AUDIT_LOG.read_text(encoding="utf-8").splitlines()
    out: list[dict] = []
    for line in lines[-n:]:
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out