import React, { useState } from "react";
import { X } from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";
import { SystemPromptEditor } from "./SystemPromptEditor";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: string | null;
}

export const SettingsModal: React.FC<Props> = ({ open, onClose, sessionId }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"general" | "system">("general");

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ width: "min(640px, 94vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="font-semibold text-lg">{t("settings.title")}</div>
          <button className="btn btn-ghost" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="flex border-b border-border">
          <button className={`btn btn-ghost rounded-none ${tab === "general" ? "border-b-2 border-accent" : ""}`} onClick={() => setTab("general")}>
            General
          </button>
          <button className={`btn btn-ghost rounded-none ${tab === "system" ? "border-b-2 border-accent" : ""}`} onClick={() => setTab("system")}>
            System Prompt
          </button>
        </div>
        <div className="p-5 space-y-4">
          {tab === "general" && <LanguageSelector />}
          {tab === "system" && <SystemPromptEditor sessionId={sessionId} />}
        </div>
      </div>
    </div>
  );
};