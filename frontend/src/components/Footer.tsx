import React from "react";
import { useTranslation } from "react-i18next";

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border bg-bg-soft/40 px-4 py-2 text-[0.72rem] text-fg-mute flex items-center justify-between">
      <span>
        {t("footer.createdBy")}{" "}
        <a
          href="https://github.com/ImCoronaDev"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover underline-offset-2 hover:underline"
        >
          @ImCoronaDev
        </a>
      </span>
      <span className="opacity-70">MIT License</span>
    </footer>
  );
};