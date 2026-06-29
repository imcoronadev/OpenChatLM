from __future__ import annotations
import time
from dataclasses import dataclass, field
from typing import Any
import asyncio
import uuid
from ..config import settings


@dataclass
class PendingApproval:
    id: str
    session_id: str
    tool: str
    args: dict
    preview: str = ""
    created_at: float = field(default_factory=time.time)
    event: asyncio.Event = field(default_factory=asyncio.Event)
    decision: str | None = None  # "approve" | "deny"
    bypass_window: int = 0  # seconds
    timed_out: bool = False


class ApprovalManager:
    def __init__(self) -> None:
        self._pending: dict[str, PendingApproval] = {}
        self._bypass_until: dict[str, float] = {}  # session_id -> epoch

    def bypass_active(self, session_id: str) -> bool:
        until = self._bypass_until.get(session_id, 0)
        if until <= time.time():
            self._bypass_until.pop(session_id, None)
            return False
        return True

    def bypass_remaining(self, session_id: str) -> int:
        until = self._bypass_until.get(session_id, 0)
        return max(0, int(until - time.time()))

    def enable_bypass(self, session_id: str, seconds: int | None = None) -> int:
        ttl = seconds if seconds is not None else settings.bypass_ttl_seconds
        self._bypass_until[session_id] = time.time() + ttl
        return ttl

    def disable_bypass(self, session_id: str) -> None:
        self._bypass_until.pop(session_id, None)

    def request(self, session_id: str, tool: str, args: dict, preview: str = "") -> PendingApproval:
        ap = PendingApproval(
            id=str(uuid.uuid4()),
            session_id=session_id,
            tool=tool,
            args=args,
            preview=preview,
        )
        self._pending[ap.id] = ap
        return ap

    def get(self, approval_id: str) -> PendingApproval | None:
        return self._pending.get(approval_id)

    def decide(self, approval_id: str, decision: str, bypass_seconds: int = 0) -> PendingApproval | None:
        ap = self._pending.get(approval_id)
        if not ap:
            return None
        ap.decision = decision
        if decision == "approve" and bypass_seconds > 0:
            self.enable_bypass(ap.session_id, bypass_seconds)
        ap.event.set()
        return ap

    def cleanup(self, approval_id: str) -> None:
        self._pending.pop(approval_id, None)

    async def wait(self, approval_id: str, timeout: float | None = None) -> PendingApproval:
        ap = self._pending[approval_id]
        try:
            await asyncio.wait_for(ap.event.wait(), timeout=timeout)
        except asyncio.TimeoutError:
            ap.timed_out = True
            ap.event.set()
        return ap


approval_manager = ApprovalManager()