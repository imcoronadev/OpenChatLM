from __future__ import annotations
import re
from dataclasses import dataclass
from typing import Awaitable, Callable


@dataclass
class CommandResult:
    handled: bool
    reply: str = ""
    error: str = ""
    clean_user_message: str | None = None
    flags: dict | None = None


SLASH_RE = re.compile(r"^/(\w+)(?:\s+(.*))?$", re.DOTALL)


def parse_slash(text: str) -> tuple[str, str] | None:
    m = SLASH_RE.match(text.strip())
    if not m:
        return None
    return m.group(1).lower(), (m.group(2) or "").strip()


# Each handler can mutate or replace the user message before sending to the LLM.
Handler = Callable[[str, str], "CommandResult"]


def cmd_search(args: str) -> CommandResult:
    if not args:
        return CommandResult(handled=True, error="Usage: /search <query>")
    return CommandResult(
        handled=True,
        reply="",
        clean_user_message=args,
        flags={"inject_search": True, "query": args},
    )


def cmd_think(args: str) -> CommandResult:
    return CommandResult(handled=True, clean_user_message=args or "", flags={"force_think": True})


def cmd_skill(args: str) -> CommandResult:
    if not args:
        return CommandResult(handled=True, error="Usage: /skill <name>")
    return CommandResult(handled=True, clean_user_message="", flags={"activate_skill": args})


def cmd_clear(_: str) -> CommandResult:
    return CommandResult(handled=True, reply="(cleared by user)", flags={"clear_session": True})


def cmd_model(args: str) -> CommandResult:
    if not args:
        return CommandResult(handled=True, error="Usage: /model <model-name>")
    return CommandResult(handled=True, clean_user_message="", flags={"switch_model": args})


def cmd_help(_: str) -> CommandResult:
    return CommandResult(
        handled=True,
        reply=(
            "Commands:\n"
            "/search <query> - search the web and inject results\n"
            "/think - force a <thought> block (MetaThink)\n"
            "/skill <name> - activate a skill for this turn\n"
            "/model <name> - switch the active model\n"
            "/clear - clear current session messages\n"
            "/help - show this message"
        ),
    )


HANDLERS: dict[str, Handler] = {
    "search": cmd_search,
    "think": cmd_think,
    "skill": cmd_skill,
    "clear": cmd_clear,
    "model": cmd_model,
    "help": cmd_help,
    "?": cmd_help,
}


def dispatch(text: str) -> CommandResult:
    parsed = parse_slash(text)
    if not parsed:
        return CommandResult(handled=False, clean_user_message=text)
    name, args = parsed
    h = HANDLERS.get(name)
    if not h:
        return CommandResult(handled=False, clean_user_message=text)
    return h(args)