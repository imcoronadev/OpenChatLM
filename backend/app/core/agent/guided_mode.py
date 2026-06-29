from __future__ import annotations
from typing import Any
from .tool_parser import CALL_TOOL_RE
from .tool_executor import list_tools


class GuidedMode:
    """Tracks how often a model fails to emit a valid CALL_TOOL line.

    After FAIL_THRESHOLD misses in a single turn, the agent appends a hint
    pointing the model at the next likely action.
    """

    FAIL_THRESHOLD = 3

    def __init__(self) -> None:
        self.failures: int = 0
        self.attempted_tools: list[str] = []

    def record_attempt(self, tool_name: str) -> None:
        self.attempted_tools.append(tool_name)
        self.failures = 0

    def record_failure(self) -> None:
        self.failures += 1

    def should_engage(self) -> bool:
        return self.failures >= self.FAIL_THRESHOLD

    def hint(self) -> str:
        tool_list = "\n".join(
            f"- {t['name']} ({t['permission']}): {t['description']}\n  Args: {t['schema']}"
            for t in list_tools()
        )
        return (
            "\n\n[System: Your previous tool calls were not parseable. "
            "Please emit EXACTLY one line of this form and nothing else for the tool invocation:\n"
            'CALL_TOOL:ToolName {"arg": "value"}\n'
            f"Available tools:\n{tool_list}\n]"
        )

    def reset(self) -> None:
        self.failures = 0
        self.attempted_tools = []