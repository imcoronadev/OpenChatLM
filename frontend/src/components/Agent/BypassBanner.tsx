import React, { useEffect } from "react";
import { useAgentStore } from "@/stores/agentStore";
import { useChatStore } from "@/stores/chatStore";
import { Zap, ZapOff } from "lucide-react";
import { useTranslation } from "react-i18next";

export const BypassBanner: React.FC = () => {
  const { t } = useTranslation();
  const { bypassActive, bypassRemaining, pollBypass, setBypass } = useAgentStore();
  const { activeId } = useChatStore();

  useEffect(() => {
    if (!activeId) return;
    if (!bypassActive) return;
    const id = setInterval(() => pollBypass(activeId), 1000);
    return () => clearInterval(id);
  }, [activeId, bypassActive, pollBypass]);

  if (!bypassActive) return null;

  return (
    <div
      className="flex items-center justify-between px-4 py-1.5 text-sm border-b border-border"
      style={{ background: "rgba(122,162,247,0.12)", color: "rgb(var(--accent))" }}
    >
      <span className="flex items-center gap-2">
        <Zap size={14} /> {t("agent.bypass.active")} <strong>{bypassRemaining}s</strong>
      </span>
      <button className="btn btn-ghost" onClick={() => activeId && setBypass(activeId, false)}>
        <ZapOff size={14} /> disable
      </button>
    </div>
  );
};