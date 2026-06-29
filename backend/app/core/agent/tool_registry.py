from __future__ import annotations
from typing import Any
from .tool_executor import list_tools


def build_tools_block() -> str:
    lines = ["## Available tools\n"]
    for t in list_tools():
        lines.append(f"- `{t['name']}` (permission: {t['permission']}): {t['description']}")
        lines.append(f"  Args: {t['schema']}")
    return "\n".join(lines)


def build_agent_system_prompt(
    workspace_path: str,
    active_skills: list[dict] | None = None,
    native_thinking: bool = False,
) -> str:
    parts: list[str] = []
    if not native_thinking:
        # MetaThink will be added separately as a protected skill block.
        pass
    if active_skills:
        for s in active_skills:
            if s.get("is_meta") and s["id"] == "_meta_think":
                continue  # handled below
            addition = s.get("system_prompt_addition")
            if addition:
                parts.append(addition)
    parts.append(build_tools_block())
    parts.append(f"## Workspace\nYour current working directory is: `{workspace_path}`")
    parts.append(
        "All file paths and commands must stay inside this directory. "
        "Path traversal outside the workspace is rejected."
    )
    return "\n\n".join(parts)