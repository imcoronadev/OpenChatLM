import React, { useEffect, useState } from "react";
import { Plus, MessageSquare, Trash2, Clock, Settings, Cpu, BookOpen, Search, Bot, BotOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useChatStore } from "@/stores/chatStore";
import { useAgentStore } from "@/stores/agentStore";
import { Logo } from "./Logo";
import clsx from "clsx";

interface Props {
  onOpenSettings: () => void;
  onOpenModels: () => void;
  onOpenSkills: () => void;
}

export const Sidebar: React.FC<Props> = ({ onOpenSettings, onOpenModels, onOpenSkills }) => {
  const { t } = useTranslation();
  const { sessions, activeId, loadSessions, createSession, setActive, deleteSession } = useChatStore();
  const agent = useAgentStore();
  const [filter, setFilter] = useState("");

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const filtered = sessions.filter((s) => s.title.toLowerCase().includes(filter.toLowerCase()));

  return (
    <aside className="w-72 shrink-0 h-full flex flex-col border-r border-border bg-bg-soft/50">
      <div className="p-4 border-b border-border">
        <Logo size={32} />
      </div>

      <div className="p-3">
        <button
          className="btn btn-primary w-full justify-center"
          onClick={() => createSession("New chat", false)}
        >
          <Plus size={16} /> {t("sidebar.newChat")}
        </button>
        <button
          className="btn btn-ghost w-full justify-center mt-2"
          onClick={() => createSession("Temporary chat", true)}
        >
          <Clock size={16} /> {t("sidebar.ephemeral")}
        </button>
      </div>

      <div className="px-3 pb-2">
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)", color: "rgb(var(--fg-mute))" }} />
          <input
            className="input"
            style={{ paddingLeft: 32 }}
            placeholder={t("sidebar.search")}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {filtered.map((s) => (
          <div
            key={s.id}
            className={clsx(
              "group flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors",
              activeId === s.id ? "bg-bg-elev border border-border" : "hover:bg-bg-soft border border-transparent"
            )}
            onClick={() => setActive(s.id)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare size={14} className="shrink-0 text-fg-mute" />
              <span className="truncate text-sm">{s.title || "Untitled"}</span>
              {s.ephemeral && <span className="tag">tmp</span>}
            </div>
            <button
              className="btn btn-ghost opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ padding: "0.2rem" }}
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Delete chat?")) deleteSession(s.id);
              }}
              aria-label="delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center text-fg-mute text-sm py-4">No chats</div>}
      </nav>

      <div className="border-t border-border p-2 space-y-1">
        <button
          className={clsx("btn btn-ghost w-full justify-start", agent.enabled && "text-accent")}
          onClick={() => agent.setEnabled(!agent.enabled)}
        >
          {agent.enabled ? <Bot size={16} /> : <BotOff size={16} />}
          {t("agent.toggle")}
          {agent.bypassActive && (
            <span className="ml-auto tag" style={{ borderColor: "rgb(var(--accent))" }}>
              bypass {agent.bypassRemaining}s
            </span>
          )}
        </button>
        <button className="btn btn-ghost w-full justify-start" onClick={onOpenModels}>
          <Cpu size={16} /> {t("sidebar.models")}
        </button>
        <button className="btn btn-ghost w-full justify-start" onClick={onOpenSkills}>
          <BookOpen size={16} /> {t("sidebar.skills")}
        </button>
        <button className="btn btn-ghost w-full justify-start" onClick={onOpenSettings}>
          <Settings size={16} /> {t("sidebar.settings")}
        </button>
      </div>
    </aside>
  );
};