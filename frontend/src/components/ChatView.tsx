import React, { useEffect, useMemo, useRef, useState } from "react";
import { Send, Square, Cpu, Brain, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAgentStore } from "@/stores/agentStore";
import { MessageBubble } from "./MessageBubble";
import { api, Skill } from "@/lib/api";

interface Props {
  onOpenModels: () => void;
  onOpenSkills: () => void;
}

export const ChatView: React.FC<Props> = ({ onOpenModels, onOpenSkills }) => {
  const { t } = useTranslation();
  const { activeId, messages, streaming, thinking, draft, send, stop, setDraft } = useChatStore();
  const { activeSkills } = useSettingsStore();
  const agent = useAgentStore();
  const [think, setThink] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const placeholder = useMemo(() => t("chat.placeholder"), [t]);

  const onSubmit = () => {
    const text = draft.trim();
    if (!text || !activeId || streaming) return;
    send(text, { think: think || undefined, active_skills: activeSkills });
  };

  if (!activeId) {
    return (
      <main className="flex-1 h-full flex items-center justify-center text-fg-mute">
        <div className="text-center space-y-3">
          <div className="text-lg">{t("chat.welcome")}</div>
          <div className="flex items-center justify-center gap-2">
            <button className="btn" onClick={onOpenModels}>
              <Cpu size={16} /> {t("sidebar.models")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 h-full flex flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-fg-mute py-10">{t("chat.emptyState")}</div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {thinking && streaming && (
          <div className="flex items-center gap-2 text-fg-mute text-sm animate-pulse-soft">
            <Brain size={14} /> {t("chat.thinking")}
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 bg-bg-soft/40">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <button
              className={`btn ${think ? "btn-primary" : ""}`}
              onClick={() => setThink((x) => !x)}
              title="/think"
            >
              <Brain size={14} /> /think
            </button>
            <button className="btn btn-ghost" onClick={onOpenSkills} title="skills">
              <BookOpen size={14} /> {activeSkills.length > 0 ? `${activeSkills.length} skill(s)` : "skills"}
            </button>
            <button className="btn btn-ghost" onClick={onOpenModels} title="model">
              <Cpu size={14} /> model
            </button>
            <div className="ml-auto text-xs text-fg-mute">
              <span className="kbd">/</span> commands
            </div>
          </div>
          <div className="flex items-end gap-2">
            <textarea
              className="textarea"
              rows={3}
              placeholder={placeholder}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
            />
            {streaming ? (
              <button className="btn btn-danger" onClick={stop}>
                <Square size={14} /> {t("chat.stop")}
              </button>
            ) : (
              <button className="btn btn-primary" onClick={onSubmit} disabled={!draft.trim()}>
                <Send size={14} /> {t("chat.send")}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};