import React, { useState } from "react";
import { User, Bot, Wrench, Check, X } from "lucide-react";
import { Markdown } from "./Markdown";
import { ThinkingBlock } from "./ThinkingBlock";
import type { Message } from "@/lib/api";

interface Props {
  message: Message;
}

interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  result: { ok: boolean; [k: string]: unknown };
}

function parseToolCalls(raw: string): ToolCall[] {
  if (!raw) return [];
  return raw
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as ToolCall;
      } catch {
        return { tool: "?", args: {}, result: { ok: false } };
      }
    });
}

const ToolCallCard: React.FC<{ tc: ToolCall }> = ({ tc }) => {
  const [open, setOpen] = useState(false);
  const ok = tc.result?.ok;
  return (
    <div className="tool-call-card">
      <button
        className="tool-header w-full text-left flex items-center justify-between"
        onClick={() => setOpen((o) => !o)}
        style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", width: "100%" }}
      >
        <span className="flex items-center gap-2">
          <Wrench size={14} />
          <strong>{tc.tool}</strong>
          <span className="text-fg-mute text-[0.72rem]">{JSON.stringify(tc.args).slice(0, 80)}</span>
        </span>
        <span className={`tag ${ok ? "" : "btn-danger"}`} style={{ borderColor: ok ? "rgb(var(--border))" : undefined }}>
          {ok ? <Check size={10} /> : <X size={10} />}
          {ok ? "ok" : "fail"}
        </span>
      </button>
      {open && (
        <div className="tool-body">
          <div className="text-fg-mute text-[0.72rem] mb-1">Arguments</div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(tc.args, null, 2)}</pre>
          <div className="text-fg-mute text-[0.72rem] mt-2 mb-1">Result</div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(tc.result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export const MessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === "user";
  const toolCalls = parseToolCalls(message.tool_calls);

  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #7aa2f7, #bb9af7)" }}
        >
          <Bot size={16} color="#0b0d10" />
        </div>
      )}
      <div className={isUser ? "bubble-user" : "bubble-assistant"} style={{ maxWidth: "85%" }}>
        {!isUser && message.thought && <ThinkingBlock content={message.thought} />}
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <Markdown content={message.content || (message.thought ? "" : "...")} />
        )}
        {toolCalls.length > 0 && (
          <div className="mt-2">
            {toolCalls.map((tc, i) => (
              <ToolCallCard key={i} tc={tc} />
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgb(var(--bg-elev))", border: "1px solid rgb(var(--border))" }}
        >
          <User size={16} />
        </div>
      )}
    </div>
  );
};