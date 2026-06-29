import React, { useEffect, useState } from "react";
import { useChatStore } from "@/stores/chatStore";
import { useTranslation } from "react-i18next";
import { Save } from "lucide-react";

interface Props {
  sessionId: string | null;
}

export const SystemPromptEditor: React.FC<Props> = ({ sessionId }) => {
  const { t } = useTranslation();
  const { sessions, setSystemPrompt } = useChatStore();
  const session = sessions.find((s) => s.id === sessionId);
  const [value, setValue] = useState(session?.system_prompt || "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(session?.system_prompt || "");
  }, [sessionId, session?.system_prompt]);

  const save = async () => {
    if (!sessionId) return;
    await setSystemPrompt(sessionId, value);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t("settings.systemPrompt")}</label>
      <textarea
        className="textarea"
        rows={10}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="You are a helpful assistant..."
      />
      <div className="flex items-center gap-2">
        <button className="btn btn-primary" onClick={save}>
          <Save size={14} /> {t("common.save")}
        </button>
        {saved && <span className="text-xs text-fg-mute">Saved.</span>}
      </div>
    </div>
  );
};