from __future__ import annotations
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sse_starlette.sse import EventSourceResponse
from ..db.database import get_db
from ..db import models as db_models
from ..core.ollama_client import ollama
from ..core.think import model_supports_native_think
from ..core.context import fit_context, estimate_tokens
from ..core.search_engine import run_search
from ..core.commands import dispatch
from ..core.skills.loader import load_all_skills
from ..core.agent.tool_parser import parse as parse_tool
from ..core.agent.tool_executor import execute as exec_tool, TOOL_PERMISSIONS
from ..core.agent.tool_registry import build_agent_system_prompt
from ..core.agent.approval import approval_manager
from ..core.agent.audit_log import log as audit_log, read_tail
from ..core.agent.guided_mode import GuidedMode
from ..schemas.schemas import ChatRequest, ApprovalDecision, BypassToggle


router = APIRouter()


def _msg_out(m: db_models.Message) -> dict:
    return {
        "id": m.id,
        "role": m.role,
        "content": m.content,
        "thought": m.thought,
        "tool_calls": m.tool_calls,
        "tokens": m.tokens,
        "created_at": m.created_at.isoformat(),
    }


async def _build_history(db: AsyncSession, session_id: str, limit: int = 200) -> list[dict]:
    res = await db.execute(
        select(db_models.Message).where(db_models.Message.session_id == session_id).order_by(db_models.Message.created_at).limit(limit)
    )
    out: list[dict] = []
    for m in res.scalars().all():
        out.append({"role": m.role, "content": m.content})
    return out


@router.post("/chat/stream")
async def chat_stream(payload: ChatRequest, db: AsyncSession = Depends(get_db)):
    session = await db.get(db_models.ChatSession, payload.session_id)
    if not session:
        raise HTTPException(404, "session not found")

    user_text = payload.message.strip()
    if not user_text:
        raise HTTPException(400, "empty message")

    cmd = dispatch(user_text)
    if cmd.handled and cmd.reply:
        await db.execute(db_models.Message.__table__.insert().values(
            session_id=session.id, role="user", content=user_text
        ))
        await db.execute(db_models.Message.__table__.insert().values(
            session_id=session.id, role="assistant", content=cmd.reply
        ))
        await db.commit()

        async def _cmd_gen():
            yield {"event": "done", "data": json.dumps({"reply": cmd.reply, "error": cmd.error})}

        return EventSourceResponse(_cmd_gen())

    effective_message = cmd.clean_user_message if cmd.clean_user_message is not None else user_text
    flags = cmd.flags or {}

    inject_search = flags.get("inject_search", False)
    search_query = flags.get("query") or effective_message

    # Save user message
    await db.execute(db_models.Message.__table__.insert().values(
        session_id=session.id, role="user", content=user_text
    ))
    await db.commit()

    # Resolve model
    model_name = payload.model or session.model or ""
    if flags.get("switch_model"):
        model_name = flags["switch_model"]
        session.model = model_name
        await db.commit()
    if not model_name:
        raise HTTPException(400, "no model selected")

    # Native thinking?
    native = payload.think if payload.think is not None else model_supports_native_think(model_name)
    if flags.get("force_think"):
        native = False

    # System prompt construction
    skills = load_all_skills()
    res = await db.execute(select(db_models.AgentWorkspace).where(db_models.AgentWorkspace.active.is_(True)))
    ws = res.scalars().first()
    agent_active = ws is not None

    base_system = session.system_prompt or ""
    system_parts: list[str] = []
    if base_system:
        system_parts.append(base_system)

    meta_tools = next((s for s in skills if s["id"] == "_meta_tools"), None)
    meta_think = next((s for s in skills if s["id"] == "_meta_think"), None)

    if agent_active:
        system_parts.append(meta_tools["system_prompt_addition"] if meta_tools else "")
        system_parts.append(build_agent_system_prompt(ws.path, active_skills=skills))
    if not native and meta_think:
        system_parts.append(meta_think["system_prompt_addition"])

    # Active skills selected by user
    if payload.active_skills:
        for sid in payload.active_skills:
            sk = next((s for s in skills if s["id"] == sid), None)
            if sk and sk.get("system_prompt_addition") and not sk.get("is_meta"):
                system_parts.append(sk["system_prompt_addition"])

    # /search injection
    search_context = ""
    if inject_search:
        search_context, _ = await run_search(search_query, n=5)
        if search_context:
            system_parts.append(search_context)

    system_prompt = "\n\n".join([s for s in system_parts if s])

    history = await _build_history(db, session.id)
    if effective_message and effective_message != user_text:
        history.append({"role": "user", "content": effective_message})
    elif effective_message:
        history.append({"role": "user", "content": effective_message})

    messages = [{"role": "system", "content": system_prompt}] + history

    ctx_max = 8192
    messages = fit_context(messages, ctx_max, system_prompt=system_prompt)

    guided = GuidedMode()

    async def event_gen():
        full_text = ""
        full_thought = ""
        tool_calls_record: list[dict] = []
        cancelled = {"flag": False}

        async with ollama._client.stream(
            "POST",
            f"{ollama.host}/api/chat",
            json={
                "model": model_name,
                "messages": messages,
                "stream": True,
                **({"think": True} if native else {}),
            },
        ) as resp:
            buffer = ""
            async for line in resp.aiter_lines():
                if cancelled["flag"]:
                    break
                if not line:
                    continue
                try:
                    chunk = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if chunk.get("error"):
                    yield {"event": "error", "data": json.dumps({"error": chunk["error"]})}
                    break
                msg = chunk.get("message", {})
                piece = msg.get("content", "")
                think_piece = msg.get("thinking", "")
                if think_piece:
                    full_thought += think_piece
                    yield {"event": "thought", "data": json.dumps({"delta": think_piece})}
                if piece:
                    full_text += piece
                    buffer += piece
                    yield {"event": "delta", "data": json.dumps({"delta": piece})}

                # Try to parse tool calls as they arrive
                if agent_active and ("CALL_TOOL" in buffer or "<thought>" in buffer):
                    parsed = parse_tool(buffer)
                    if parsed.tool_name and not parsed.tool_error:
                        # Found a valid tool call: stop streaming and execute
                        permission = TOOL_PERMISSIONS.get(parsed.tool_name, "approve")
                        if permission == "approve" and not approval_manager.bypass_active(session.id):
                            preview = ""
                            if parsed.tool_name in ("WriteFile", "EditFile"):
                                try:
                                    # compute diff preview
                                    ws_path = ws.path
                                    p = parsed.tool_args.get("path")
                                    if parsed.tool_name == "WriteFile":
                                        from ..core.agent.tool_executor import _safe_resolve
                                        tgt = _safe_resolve(ws_path, p)
                                        prev = tgt.read_text(encoding="utf-8", errors="replace") if tgt.exists() else ""
                                        from ..core.agent.tool_parser import extract_diff_preview
                                        preview = extract_diff_preview(prev, parsed.tool_args.get("content", ""))
                                    elif parsed.tool_name == "EditFile":
                                        from ..core.agent.tool_executor import _safe_resolve
                                        tgt = _safe_resolve(ws_path, p)
                                        prev = tgt.read_text(encoding="utf-8", errors="replace") if tgt.exists() else ""
                                        new = prev.replace(parsed.tool_args.get("old_string", ""), parsed.tool_args.get("new_string", ""), 1)
                                        from ..core.agent.tool_parser import extract_diff_preview
                                        preview = extract_diff_preview(prev, new)
                                    elif parsed.tool_name == "RunCommand":
                                        preview = f"$ {parsed.tool_args.get('command', '')}"
                                except Exception as e:
                                    preview = f"(preview unavailable: {e})"
                            else:
                                preview = json.dumps(parsed.tool_args, indent=2)[:600]

                            ap = approval_manager.request(session.id, parsed.tool_name, parsed.tool_args, preview)
                            yield {
                                "event": "approval_required",
                                "data": json.dumps({
                                    "approval_id": ap.id,
                                    "tool": parsed.tool_name,
                                    "args": parsed.tool_args,
                                    "preview": preview,
                                }),
                            }
                            ap = await approval_manager.wait(ap.id, timeout=300)
                            if ap.timed_out or ap.decision != "approve":
                                audit_log(session.id, parsed.tool_name, parsed.tool_args, "deny", preview)
                                buffer = ""
                                continue
                            audit_log(session.id, parsed.tool_name, parsed.tool_args, "approve", preview)
                        else:
                            audit_log(session.id, parsed.tool_name, parsed.tool_args, "auto", "")
                        result = await exec_tool(parsed.tool_name, parsed.tool_args, {"workspace": ws.path if ws else ""})
                        tool_calls_record.append({"tool": parsed.tool_name, "args": parsed.tool_args, "result": result})
                        yield {
                            "event": "tool_result",
                            "data": json.dumps({"tool": parsed.tool_name, "result": result}),
                        }
                        # Inject tool result and re-prompt for continuation
                        messages.append({"role": "assistant", "content": f"CALL_TOOL:{parsed.tool_name} {json.dumps(parsed.tool_args)}"})
                        messages.append({"role": "tool", "content": json.dumps(result)})
                        buffer = ""
                        guided.record_attempt(parsed.tool_name)
                    elif parsed.tool_name and parsed.tool_error:
                        guided.record_failure()
                        if guided.should_engage():
                            messages.append({"role": "system", "content": guided.hint()})
                            guided.reset()
                    if parsed.thought:
                        if not full_thought:
                            full_thought = parsed.thought
                        yield {"event": "thought", "data": json.dumps({"delta": parsed.thought, "appended": True})}

                if chunk.get("done"):
                    break

        # Clean final text: strip CALL_TOOL residue
        cleaned = parse_tool(full_text).cleaned_text
        tokens = estimate_tokens(full_text)
        # Persist assistant message
        await db.execute(db_models.Message.__table__.insert().values(
            session_id=session.id,
            role="assistant",
            content=cleaned,
            thought=full_thought,
            tool_calls=json.dumps(tool_calls_record),
            tokens=tokens,
        ))
        if not session.title or session.title == "New chat":
            session.title = (effective_message or user_text)[:80] or "New chat"
        session.updated_at = datetime.utcnow()
        await db.commit()
        yield {
            "event": "done",
            "data": json.dumps({
                "content": cleaned,
                "thought": full_thought,
                "tokens": tokens,
                "tool_calls": tool_calls_record,
            }),
        }

    return EventSourceResponse(event_gen())


@router.post("/chat/cancel/{session_id}")
async def cancel_chat(session_id: str):
    # Best-effort cancel by sending a low-keep_alive ping
    return {"ok": True}


@router.post("/agent/approve/{approval_id}")
async def approve(approval_id: str, payload: ApprovalDecision):
    if payload.decision not in ("approve", "deny"):
        raise HTTPException(400, "decision must be approve|deny")
    ap = approval_manager.decide(approval_id, payload.decision, payload.bypass_seconds)
    if not ap:
        raise HTTPException(404, "approval not found")
    return {"ok": True, "decision": ap.decision, "bypass_seconds": payload.bypass_seconds}


@router.post("/agent/bypass/{session_id}")
async def bypass_session(session_id: str, payload: BypassToggle):
    if payload.enabled:
        ttl = approval_manager.enable_bypass(session_id, payload.seconds)
    else:
        approval_manager.disable_bypass(session_id)
        ttl = 0
    return {"ok": True, "ttl": ttl, "remaining": approval_manager.bypass_remaining(session_id)}


@router.get("/agent/bypass/{session_id}")
async def bypass_status(session_id: str):
    return {
        "active": approval_manager.bypass_active(session_id),
        "remaining": approval_manager.bypass_remaining(session_id),
    }


@router.get("/agent/audit")
async def audit(limit: int = 200):
    return read_tail(limit)


@router.get("/agent/tools")
async def tools():
    return list_tools()