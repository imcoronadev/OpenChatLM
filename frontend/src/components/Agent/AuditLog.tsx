import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, AuditEntry } from "@/lib/api";
import { RefreshCw, FileText } from "lucide-react";

export const AuditLog: React.FC = () => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  const load = async () => {
    const e = await api.audit(200);
    setEntries(e.reverse());
  };
  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText size={16} /> {t("agent.audit")}
        </h3>
        <button className="btn btn-ghost" onClick={load}>
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
        {entries.length === 0 && <div className="text-fg-mute text-sm">No entries.</div>}
        {entries.map((e, i) => (
          <div key={i} className="text-xs border border-border rounded-lg p-2 bg-bg-soft">
            <div className="flex items-center justify-between">
              <span className="font-mono">{e.tool}</span>
              <span className="text-fg-mute">{new Date(e.ts * 1000).toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center justify-between text-fg-mute">
              <span>{e.decision}</span>
              <span className="truncate ml-2">{JSON.stringify(e.args).slice(0, 60)}</span>
            </div>
            {e.result_excerpt && (
              <div className="text-fg-mute mt-1 truncate">{e.result_excerpt}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};