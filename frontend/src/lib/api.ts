const BASE = "/api";

async function http<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`${r.status} ${text}`);
  }
  if (r.status === 204) return undefined as T;
  return r.json() as Promise<T>;
}

export interface Session {
  id: string;
  title: string;
  ephemeral: boolean;
  model: string;
  system_prompt: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  role: string;
  content: string;
  thought: string;
  tool_calls: string;
  tokens: number;
  created_at: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  system_prompt_addition: string;
  trigger_keywords: string[] | string;
  parameters: Record<string, unknown> | string;
  protected: boolean;
  builtin: boolean;
  is_meta: boolean;
  is_tool: boolean;
  tool_name?: string;
  permission?: string;
}

export interface ToolInfo {
  name: string;
  permission: string;
  description: string;
  schema: Record<string, string>;
}

export interface Workspace {
  id: string;
  path: string;
  active: boolean;
  created_at: string;
}

export interface AuditEntry {
  ts: number;
  session_id: string;
  approval_id?: string;
  tool: string;
  args: Record<string, unknown>;
  decision: string;
  result_excerpt: string;
}

export const api = {
  system: () => http<{ ollama_reachable: boolean; ollama_host: string; version: string }>("/system"),
  listModels: () => http<{ models: any[]; warning?: string }>("/models"),
  showModel: (name: string) => http<any>(`/models/${encodeURIComponent(name)}`),

  listSessions: () => http<Session[]>("/sessions"),
  createSession: (body: Partial<Session>) => http<Session>("/sessions", { method: "POST", body: JSON.stringify(body) }),
  getSession: (id: string) => http<Session>(`/sessions/${id}`),
  updateSession: (id: string, body: Partial<Session>) => http<Session>(`/sessions/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteSession: (id: string) => http<{ ok: boolean }>(`/sessions/${id}`, { method: "DELETE" }),
  clearMessages: (id: string) => http<{ ok: boolean }>(`/sessions/${id}/clear`, { method: "POST" }),
  listMessages: (id: string) => http<Message[]>(`/sessions/${id}/messages`),
  searchMessages: (q: string) => http<Message[]>(`/messages/search?q=${encodeURIComponent(q)}`),

  listSkills: () => http<Skill[]>("/skills"),
  listUserSkills: () => http<Skill[]>("/skills/user"),
  listProtectedSkills: () => http<Skill[]>("/skills/protected"),
  createSkill: (body: Partial<Skill>) => http<Skill>("/skills/user", { method: "POST", body: JSON.stringify(body) }),
  updateSkill: (id: string, body: Partial<Skill>) => http<Skill>(`/skills/user/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteSkill: (id: string) => http<{ ok: boolean }>(`/skills/user/${id}`, { method: "DELETE" }),

  search: (query: string, n = 5) => http<{ context: string; results: any[] }>("/search", { method: "POST", body: JSON.stringify({ query, n_results: n }) }),

  listSettings: () => http<Record<string, string>>("/settings"),
  setSetting: (key: string, value: string) => http<{ ok: boolean }>(`/settings/${key}`, { method: "PUT", body: JSON.stringify({ value }) }),

  listWorkspaces: () => http<Workspace[]>("/workspaces"),
  setWorkspace: (path: string) => http<Workspace>("/workspaces", { method: "POST", body: JSON.stringify({ path }) }),
  activeWorkspace: () => http<{ id: string; path: string; active: boolean } | { active: null }>("/workspaces/active"),
  deleteWorkspace: (id: string) => http<{ ok: boolean }>(`/workspaces/${id}`, { method: "DELETE" }),
  listDir: (path = ".") => http<{ path: string; entries: { name: string; type: string; size: number | null }[] }>(`/files?path=${encodeURIComponent(path)}`),
  readFile: (path: string) => http<{ path: string; content: string }>(`/files/read?path=${encodeURIComponent(path)}`),

  approve: (approval_id: string, decision: "approve" | "deny", bypass_seconds = 0) =>
    http<{ ok: boolean }>(`/agent/approve/${approval_id}`, { method: "POST", body: JSON.stringify({ decision, bypass_seconds }) }),
  bypassSet: (session_id: string, enabled: boolean, seconds = 60) =>
    http<{ ok: boolean; ttl: number; remaining: number }>(`/agent/bypass/${session_id}`, { method: "POST", body: JSON.stringify({ enabled, seconds }) }),
  bypassStatus: (session_id: string) => http<{ active: boolean; remaining: number }>(`/agent/bypass/${session_id}`),
  audit: (limit = 200) => http<AuditEntry[]>(`/agent/audit?limit=${limit}`),
  tools: () => http<ToolInfo[]>("/agent/tools"),

  streamChat: (payload: { session_id: string; message: string; model?: string | null; think?: boolean | null; active_skills?: string[] }, onEvent: (e: { event: string; data: any }) => void, signal?: AbortSignal) => {
    const url = `${BASE}/chat/stream`;
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    }).then(async (resp) => {
      if (!resp.ok || !resp.body) throw new Error(`stream failed ${resp.status}`);
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() || "";
        for (const chunk of events) {
          const lines = chunk.split("\n");
          let ev = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event:")) ev = line.slice(6).trim();
            else if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (!data) continue;
          try {
            onEvent({ event: ev, data: JSON.parse(data) });
          } catch {
            onEvent({ event: ev, data });
          }
        }
      }
    });
  },
};