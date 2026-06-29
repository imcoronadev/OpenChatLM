import React, { useEffect, useState } from "react";
import { X, RefreshCw, Download, FolderInput, Cpu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useChatStore } from "@/stores/chatStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
  details?: { parameter_size?: string; quantization_level?: string; family?: string };
}

function humanSize(bytes: number) {
  if (!bytes) return "?";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${u[i]}`;
}

export const ModelsManager: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [warning, setWarning] = useState<string>("");
  const [pullName, setPullName] = useState("");
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState("");
  const { sessions, activeId, setModel } = useChatStore();

  const activeSession = sessions.find((s) => s.id === activeId);

  const load = async () => {
    try {
      const res = await api.listModels();
      setModels(res.models as OllamaModel[]);
      setWarning(res.warning || "");
    } catch (e: any) {
      setWarning(e.message);
    }
  };
  useEffect(() => {
    if (open) load();
  }, [open]);

  const pull = async () => {
    if (!pullName.trim()) return;
    setPulling(true);
    setPullProgress("starting...");
    try {
      const resp = await fetch("/api/models/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: pullName }),
      });
      const reader = resp.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line) continue;
          try {
            const j = JSON.parse(line);
            if (j.status) setPullProgress(j.status);
            if (j.completed && j.total) {
              const pct = ((j.completed / j.total) * 100).toFixed(1);
              setPullProgress(`${j.status || "downloading"} ${pct}%`);
            }
          } catch {}
        }
      }
      await load();
    } catch (e: any) {
      setPullProgress("error: " + e.message);
    } finally {
      setPulling(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ width: "min(720px, 95vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="font-semibold text-lg flex items-center gap-2">
            <Cpu size={18} /> {t("models.title")}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost" onClick={load}>
              <RefreshCw size={14} /> {t("models.refresh")}
            </button>
            <button className="btn btn-ghost" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {warning && <div className="text-sm text-yellow-400">{warning}</div>}
          <div>
            <div className="text-sm font-medium mb-2">{t("models.pull")}</div>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="qwen2.5:0.5b"
                value={pullName}
                onChange={(e) => setPullName(e.target.value)}
              />
              <button className="btn btn-primary" onClick={pull} disabled={pulling || !pullName.trim()}>
                <Download size={14} /> {pulling ? "..." : "Pull"}
              </button>
            </div>
            {pulling && <div className="text-xs text-fg-mute mt-2">{pullProgress}</div>}
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Available models</div>
            {models.length === 0 ? (
              <div className="text-fg-mute text-sm">{t("models.empty")}</div>
            ) : (
              <div className="space-y-2">
                {models.map((m) => {
                  const active = activeSession?.model === m.name;
                  return (
                    <div key={m.name} className="border border-border rounded-lg p-3 bg-bg-soft flex items-center justify-between">
                      <div>
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-fg-mute">
                          {humanSize(m.size)} · {m.details?.parameter_size || "?"} · {m.details?.quantization_level || "?"} · {m.details?.family || "?"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {active && <span className="tag">in use</span>}
                        <button
                          className="btn"
                          disabled={!activeSession}
                          onClick={async () => {
                            if (activeSession) {
                              await setModel(activeSession.id, m.name);
                            }
                          }}
                        >
                          Use
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="text-sm font-medium mb-2">{t("models.import")}</div>
            <p className="text-xs text-fg-mute mb-2">
              Place your <code className="kbd">.gguf</code> / <code className="kbd">.pth</code> / <code className="kbd">.safetensors</code> in the backend's <code className="kbd">models/</code> folder, then import:
            </p>
            <pre className="textarea" style={{ whiteSpace: "pre" }}>
{`cd backend
python scripts/import_model.py ../models/your-model.gguf yourname:q4`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};