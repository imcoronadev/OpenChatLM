from __future__ import annotations
import json
from typing import Iterable


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def fit_context(
    messages: list[dict],
    max_tokens: int,
    system_prompt: str = "",
) -> list[dict]:
    """Trim oldest messages (except first system) to fit within max_tokens."""
    out: list[dict] = []
    used = estimate_tokens(system_prompt)
    for m in messages:
        content = m.get("content", "")
        t = estimate_tokens(content)
        if used + t > max_tokens and out:
            out.pop(0)
        out.append(m)
        used += t
    return out


def activate_skill(skills: Iterable[dict], query: str) -> list[dict]:
    q = query.lower()
    matched: list[dict] = []
    for s in skills:
        kws = [k.lower() for k in s.get("trigger_keywords", [])]
        if any(k in q for k in kws):
            matched.append(s)
    return matched