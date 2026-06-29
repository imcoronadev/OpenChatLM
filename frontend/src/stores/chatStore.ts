import { create } from "zustand";
import { api, Session, Message } from "@/lib/api";

interface ChatState {
  sessions: Session[];
  activeId: string | null;
  messages: Message[];
  streaming: boolean;
  thinking: boolean;
  draft: string;
  abortCtrl: AbortController | null;

  loadSessions: () => Promise<void>;
  createSession: (title?: string, ephemeral?: boolean) => Promise<Session>;
  setActive: (id: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  clearSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  setModel: (id: string, model: string) => Promise<void>;
  setSystemPrompt: (id: string, sp: string) => Promise<void>;
  send: (text: string, options?: { model?: string; think?: boolean; active_skills?: string[] }) => Promise<void>;
  stop: () => void;
  setDraft: (s: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeId: null,
  messages: [],
  streaming: false,
  thinking: false,
  draft: "",
  abortCtrl: null,

  loadSessions: async () => {
    const sessions = await api.listSessions();
    set({ sessions });
  },

  createSession: async (title = "New chat", ephemeral = false) => {
    const s = await api.createSession({ title, ephemeral });
    set((st) => ({ sessions: [s, ...st.sessions], activeId: s.id, messages: [] }));
    return s;
  },

  setActive: async (id) => {
    const msgs = await api.listMessages(id);
    set({ activeId: id, messages: msgs });
  },

  deleteSession: async (id) => {
    await api.deleteSession(id);
    set((st) => {
      const sessions = st.sessions.filter((s) => s.id !== id);
      const activeId = st.activeId === id ? (sessions[0]?.id ?? null) : st.activeId;
      return { sessions, activeId, messages: st.activeId === id ? [] : st.messages };
    });
  },

  clearSession: async (id) => {
    await api.clearMessages(id);
    set({ messages: [] });
  },

  renameSession: async (id, title) => {
    const s = await api.updateSession(id, { title });
    set((st) => ({ sessions: st.sessions.map((x) => (x.id === id ? s : x)) }));
  },

  setModel: async (id, model) => {
    const s = await api.updateSession(id, { model });
    set((st) => ({ sessions: st.sessions.map((x) => (x.id === id ? s : x)) }));
  },

  setSystemPrompt: async (id, sp) => {
    const s = await api.updateSession(id, { system_prompt: sp });
    set((st) => ({ sessions: st.sessions.map((x) => (x.id === id ? s : x)) }));
  },

  setDraft: (s) => set({ draft: s }),

  send: async (text, options) => {
    const id = get().activeId;
    if (!id) return;
    const userMsg: Message = {
      id: -Date.now(),
      role: "user",
      content: text,
      thought: "",
      tool_calls: "",
      tokens: 0,
      created_at: new Date().toISOString(),
    };
    const assistantId = -Date.now() - 1;
    const assistant: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      thought: "",
      tool_calls: "",
      tokens: 0,
      created_at: new Date().toISOString(),
    };
    set((st) => ({ messages: [...st.messages, userMsg, assistant], streaming: true, thinking: true, draft: "" }));

    const ctrl = new AbortController();
    set({ abortCtrl: ctrl });

    try {
      await api.streamChat(
        {
          session_id: id,
          message: text,
          model: options?.model ?? null,
          think: options?.think ?? null,
          active_skills: options?.active_skills ?? [],
        },
        (evt) => {
          if (evt.event === "delta") {
            const d: string = evt.data.delta;
            set((st) => ({
              messages: st.messages.map((m) => (m.id === assistantId ? { ...m, content: m.content + d } : m)),
              thinking: false,
            }));
          } else if (evt.event === "thought") {
            const d: string = evt.data.delta;
            const appended: boolean = !!evt.data.appended;
            set((st) => ({
              messages: st.messages.map((m) =>
                m.id === assistantId ? { ...m, thought: appended ? m.thought + "\n" + d : m.thought + d } : m
              ),
            }));
          } else if (evt.event === "approval_required") {
            const approvalId = evt.data.approval_id as string;
            const toolName = evt.data.tool as string;
            const args = evt.data.args;
            const preview = evt.data.preview as string;
            const evtCustom = new CustomEvent("openchat:approval", { detail: { approvalId, toolName, args, preview } });
            window.dispatchEvent(evtCustom);
          } else if (evt.event === "tool_result") {
            const tc = JSON.stringify(evt.data);
            set((st) => ({
              messages: st.messages.map((m) =>
                m.id === assistantId ? { ...m, tool_calls: m.tool_calls ? m.tool_calls + "\n" + tc : tc } : m
              ),
            }));
          } else if (evt.event === "error") {
            const err = evt.data.error || "Unknown error";
            set((st) => ({
              messages: st.messages.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + `\n\n[error: ${err}]` } : m
              ),
            }));
          } else if (evt.event === "done") {
            set((st) => ({
              messages: st.messages.map((m) =>
                m.id === assistantId
                  ? { ...m, content: evt.data.content ?? m.content, thought: evt.data.thought ?? m.thought, tokens: evt.data.tokens ?? m.tokens }
                  : m
              ),
              streaming: false,
              thinking: false,
            }));
            get().loadSessions();
          }
        },
        ctrl.signal
      );
    } catch (e: any) {
      set((st) => ({
        messages: st.messages.map((m) =>
          m.id === assistantId ? { ...m, content: m.content + `\n\n[stream error: ${e.message}]` } : m
        ),
        streaming: false,
        thinking: false,
      }));
    } finally {
      set({ abortCtrl: null });
      // Reload messages to sync IDs
      try {
        const msgs = await api.listMessages(id);
        set({ messages: msgs });
      } catch {}
    }
  },

  stop: () => {
    get().abortCtrl?.abort();
    set({ streaming: false, thinking: false });
  },
}));