import React from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "@/i18n";
import { useSettingsStore } from "@/stores/settingsStore";
import { Languages, Sun, Moon } from "lucide-react";

export const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();
  const { theme, setTheme, bypassTtl, setBypassTtl } = useSettingsStore();

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium flex items-center gap-2">
          <Languages size={14} /> {t("settings.language")}
        </label>
        <select
          className="select mt-1"
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">{t("settings.theme")}</label>
        <div className="flex gap-2 mt-1">
          <button className={`btn ${theme === "dark" ? "btn-primary" : ""}`} onClick={() => setTheme("dark")}>
            <Moon size={14} /> {t("settings.theme.dark")}
          </button>
          <button className={`btn ${theme === "light" ? "btn-primary" : ""}`} onClick={() => setTheme("light")}>
            <Sun size={14} /> {t("settings.theme.light")}
          </button>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">{t("settings.bypassTtl")}</label>
        <input
          className="input mt-1"
          type="number"
          min={10}
          max={600}
          value={bypassTtl}
          onChange={(e) => setBypassTtl(parseInt(e.target.value || "60"))}
        />
      </div>
    </div>
  );
};