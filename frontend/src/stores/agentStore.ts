import { create } from "zustand";
import { api, Workspace } from "@/lib/api";

interface AgentState {
  enabled: boolean;
  workspace: Workspace | null;
  bypassActive: boolean;
  bypassRemaining: number;
  pending: { id: string; tool: string; args: any; preview: string } | null;
  setEnabled: (v: boolean) => void;
  refreshWorkspace: () => Promise<void>;
  setWorkspace: (path: string) => Promise<void>;
  approve: (id: string, bypassSeconds?: number) => Promise<void>;
  deny: (id: string) => Promise<void>;
  pollBypass: (sessionId: string) => Promise<void>;
  setBypass: (sessionId: string, enabled: boolean, seconds?: number) => Promise<void>;
  setPending: (p: AgentState["pending"]) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  enabled: false,
  workspace: null,
  bypassActive: false,
  bypassRemaining: 0,
  pending: null,

  setEnabled: (v) => set({ enabled: v }),

  refreshWorkspace: async () => {
    const w = await api.activeWorkspace();
    if ("active" in w && w.active === null) set({ workspace: null });
    else if ("path" in w) set({ workspace: w as Workspace });
  },

  setWorkspace: async (path) => {
    const w = await api.setWorkspace(path);
    set({ workspace: w });
  },

  approve: async (id, bypassSeconds = 0) => {
    await api.approve(id, "approve", bypassSeconds);
    set({ pending: null });
  },

  deny: async (id) => {
    await api.approve(id, "deny");
    set({ pending: null });
  },

  pollBypass: async (sessionId) => {
    const s = await api.bypassStatus(sessionId);
    set({ bypassActive: s.active, bypassRemaining: s.remaining });
  },

  setBypass: async (sessionId, enabled, seconds = 60) => {
    await api.bypassSet(sessionId, enabled, seconds);
    const s = await api.bypassStatus(sessionId);
    set({ bypassActive: s.active, bypassRemaining: s.remaining });
  },

  setPending: (p) => set({ pending: p }),
}));