import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAgentStore } from "@/stores/agentStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { ShieldCheck, ShieldX, ShieldAlert } from "lucide-react";

export const ApprovalDialog: React.FC = () => {
  const { t } = useTranslation();
  const { pending, approve, deny } = useAgentStore();
  const { bypassTtl } = useSettingsStore();
  const [busy, setBusy] = useState(false);

  if (!pending) return null;

  const isWrite = pending.tool === "WriteFile" || pending.tool === "EditFile";
  const isCommand = pending.tool === "RunCommand";

  const onApprove = async (bypass = false) => {
    setBusy(true);
    try {
      await approve(pending.id, bypass ? bypassTtl : 0);
    } finally {
      setBusy(false);
    }
  };
  const onDeny = async () => {
    setBusy(true);
    try {
      await deny(pending.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ width: "min(720px, 94vw)" }}>
        <div className="p-5 border-b border-border flex items-center gap-2">
          {isWrite ? <ShieldAlert size={18} color="#fbbf24" /> : <ShieldCheck size={18} />}
          <div>
            <div className="font-semibold">{t("agent.approval.title")}</div>
            <div className="text-xs text-fg-mute">
              Tool <code className="kbd">{pending.tool}</code>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {isWrite && (
            <div>
              <div className="text-sm font-medium mb-1">Diff preview</div>
              <pre className="textarea" style={{ maxHeight: 240, overflow: "auto", whiteSpace: "pre" }}>
                {pending.preview || "(no preview)"}
              </pre>
            </div>
          )}
          {isCommand && (
            <div>
              <div className="text-sm font-medium mb-1">Command</div>
              <pre className="textarea" style={{ maxHeight: 120 }}>{pending.preview}</pre>
            </div>
          )}
          <details>
            <summary className="text-sm cursor-pointer">Arguments</summary>
            <pre className="textarea mt-2" style={{ maxHeight: 200 }}>
              {JSON.stringify(pending.args, null, 2)}
            </pre>
          </details>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button className="btn btn-danger" onClick={onDeny} disabled={busy}>
            <ShieldX size={14} /> {t("agent.approval.deny")}
          </button>
          <button className="btn" onClick={() => onApprove(false)} disabled={busy}>
            {t("agent.approval.approve")}
          </button>
          <button className="btn btn-primary" onClick={() => onApprove(true)} disabled={busy}>
            {t("agent.approval.bypass")} ({bypassTtl}s)
          </button>
        </div>
      </div>
    </div>
  );
};