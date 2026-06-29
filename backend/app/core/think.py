from __future__ import annotations
import re


NATIVE_THINK_PATTERNS = [
    "deepseek-r1",
    "qwen3",
    "qwq",
    "magpie-reasoning",
    "phi4-reasoning",
    "reasoning",
]


def model_supports_native_think(model_name: str) -> bool:
    name = (model_name or "").lower()
    return any(p in name for p in NATIVE_THINK_PATTERNS)


def meta_think_block() -> str:
    return (
        "IMPORTANT: Before answering, emit a <thought>...</thought> block with your reasoning. "
        "Then give your final answer outside that block."
    )