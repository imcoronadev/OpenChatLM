from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    title: str = "New chat"
    ephemeral: bool = False
    model: str = ""
    system_prompt: str = ""


class SessionUpdate(BaseModel):
    title: str | None = None
    model: str | None = None
    system_prompt: str | None = None
    ephemeral: bool | None = None


class SessionOut(BaseModel):
    id: str
    title: str
    ephemeral: bool
    model: str
    system_prompt: str
    created_at: str
    updated_at: str


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    thought: str = ""
    tool_calls: str = ""
    tokens: int = 0
    created_at: str


class ChatRequest(BaseModel):
    session_id: str
    message: str
    model: str | None = None
    think: bool | None = None
    active_skills: list[str] = Field(default_factory=list)


class SkillCreate(BaseModel):
    id: str
    name: str
    description: str = ""
    system_prompt_addition: str = ""
    trigger_keywords: list[str] = Field(default_factory=list)
    parameters: dict[str, Any] = Field(default_factory=dict)


class SkillUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    system_prompt_addition: str | None = None
    trigger_keywords: list[str] | None = None
    parameters: dict[str, Any] | None = None


class SettingUpdate(BaseModel):
    value: str


class WorkspaceSet(BaseModel):
    path: str


class ApprovalDecision(BaseModel):
    decision: str
    bypass_seconds: int = 0


class BypassToggle(BaseModel):
    enabled: bool
    seconds: int = 60


class ImportModelRequest(BaseModel):
    path: str
    tag: str
    template: str = ""