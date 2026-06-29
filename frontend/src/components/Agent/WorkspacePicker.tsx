import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAgentStore } from "@/stores/agentStore";
import { FolderSearch } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const WorkspacePicker: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { setWorkspace, workspace } = useAgentStore();
  const [path, setPath] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setPath(workspace?.path || "");
      setError("");
    }
  }, [open, workspace]);

  if (!open) return null;

  const submit = async () => {
    try {
      await setWorkspace(path.trim());
      onClose();
    } catch (e: any) {
      setError(e.message || "Could not set workspace");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <FolderSearch size={18} /> {t("agent.workspace.title")}
          </div>
          <div className="text-sm text-fg-mute mt-1">{t("agent.workspace.description")}</div>
        </div>
        <div className="p-5 space-y-3">
          <label className="text-sm">Absolute path</label>
          <input
            className="input"
            placeholder="/home/user/projects/myapp"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            autoFocus
          />
          {error && <div className="text-sm text-red-400">{error}</div>}
          <div className="text-xs text-fg-mute">
            The agent will refuse any path outside this directory (path traversal protection).
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button className="btn" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn btn-primary" onClick={submit} disabled={!path.trim()}>
            {t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
};