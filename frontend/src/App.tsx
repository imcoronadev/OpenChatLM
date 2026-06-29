import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatView } from "@/components/ChatView";
import { SettingsModal } from "@/components/SettingsModal";
import { ModelsManager } from "@/components/ModelsManager";
import { SkillsPanel } from "@/components/SkillsPanel";
import { Footer } from "@/components/Footer";
import { WorkspacePicker } from "@/components/Agent/WorkspacePicker";
import { ApprovalDialog } from "@/components/Agent/ApprovalDialog";
import { BypassBanner } from "@/components/Agent/BypassBanner";
import { AuditLog } from "@/components/Agent/AuditLog";

const AuditHost: React.FC = () => <AuditLog />;
import { useChatStore } from "@/stores/chatStore";
import { useAgentStore } from "@/stores/agentStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Bot, X } from "lucide-react";

export const App: React.FC = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  const { activeId } = useChatStore();
  const agent = useAgentStore();
  const { theme, language } = useSettingsStore();

  // Theme bootstrap
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  // Bootstrap session + workspace
  useEffect(() => {
    (async () => {
      const sessions = await (await fetch("/api/sessions")).json();
      if (Array.isArray(sessions) && sessions.length === 0) {
        await useChatStore.getState().createSession("Welcome", false);
      } else {
        useChatStore.setState({ sessions });
        if (sessions[0]) useChatStore.getState().setActive(sessions[0].id);
      }
      await agent.refreshWorkspace();
      if (!agent.workspace) setWorkspaceOpen(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Agent approval event listener
  useEffect(() => {
    const handler = (e: any) => {
      const { approvalId, toolName, args, preview } = e.detail;
      agent.setPending({ id: approvalId, tool: toolName, args, preview });
    };
    window.addEventListener("openchat:approval", handler as EventListener);
    return () => window.removeEventListener("openchat:approval", handler as EventListener);
  }, [agent]);

  // Poll bypass when agent enabled
  useEffect(() => {
    if (!activeId) return;
    const tick = () => agent.pollBypass(activeId);
    tick();
    const id = setInterval(tick, 1500);
    return () => clearInterval(id);
  }, [activeId, agent]);

  // Auto-enable agent when workspace is set
  useEffect(() => {
    if (agent.workspace && !agent.enabled) agent.setEnabled(true);
  }, [agent.workspace]); // eslint-disable-line

  return (
    <div className="h-screen flex flex-col bg-bg text-fg">
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenModels={() => setModelsOpen(true)}
          onOpenSkills={() => setSkillsOpen(true)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <BypassBanner />
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-soft/40">
            <div className="flex items-center gap-2">
              {agent.enabled && (
                <span className="tag" style={{ borderColor: "rgb(var(--accent))", color: "rgb(var(--accent))" }}>
                  <Bot size={12} /> Agent
                </span>
              )}
              <span className="text-xs text-fg-mute">
                {agent.workspace ? `ws: ${agent.workspace.path}` : "no workspace"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {agent.enabled && (
                <button className="btn btn-ghost" onClick={() => setAuditOpen((v) => !v)}>
                  Audit
                </button>
              )}
              {agent.enabled && (
                <button className="btn btn-ghost" onClick={() => setWorkspaceOpen(true)}>
                  Change workspace
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 flex overflow-hidden">
            <ChatView onOpenModels={() => setModelsOpen(true)} onOpenSkills={() => setSkillsOpen(true)} />
            {auditOpen && (
              <aside className="w-80 border-l border-border bg-bg-soft/40 p-3 overflow-y-auto">
                <div className="flex justify-between mb-2">
                  <h3 className="font-semibold">Audit</h3>
                  <button className="btn btn-ghost" onClick={() => setAuditOpen(false)}>
                    <X size={14} />
                  </button>
                </div>
                <AuditHost />
              </aside>
            )}
          </div>
        </div>
      </div>
      <Footer />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} sessionId={activeId} />
      <ModelsManager open={modelsOpen} onClose={() => setModelsOpen(false)} />
      <SkillsPanel open={skillsOpen} onClose={() => setSkillsOpen(false)} />
      <WorkspacePicker open={workspaceOpen} onClose={() => setWorkspaceOpen(false)} />
      <ApprovalDialog />
    </div>
  );
};